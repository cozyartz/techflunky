// Education/Course Platform API
import type { APIContext } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST({ request, locals }: APIContext) {
  const { DB, BUCKET } = locals.runtime.env;
  
  try {
    const data = await request.json();
    const { 
      title, 
      description, 
      price, 
      category, 
      level = 'beginner',
      durationHours,
      modules = []
    } = data;

    // TODO: Get authenticated user
    const instructorId = 'temp-user-id';

    // Validate instructor permissions
    const user = await DB.prepare(
      'SELECT subscription_status FROM users WHERE id = ?'
    ).bind(instructorId).first();

    if (!user || user.subscription_status === 'free') {
      return new Response(JSON.stringify({ 
        error: 'Pro subscription required to create courses' 
      }), { status: 403 });
    }

    // Generate slug
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Create course
    const course = await DB.prepare(`
      INSERT INTO courses (
        instructor_id, title, slug, description, price, 
        category, level, duration_hours, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).bind(
      instructorId,
      title,
      slug,
      description,
      price * 100, // Convert to cents
      category,
      level,
      durationHours
    ).run();

    const courseId = course.meta.last_row_id;

    // Create course modules if provided
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      await DB.prepare(`
        INSERT INTO course_modules (
          course_id, title, description, order_index, 
          content, duration_minutes, is_preview
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        courseId,
        module.title,
        module.description || '',
        i + 1,
        module.content || '',
        module.durationMinutes || 0,
        module.isPreview || false
      ).run();
    }

    return new Response(JSON.stringify({
      success: true,
      courseId,
      slug
    }), { status: 201 });

  } catch (error) {
    console.error('Error creating course:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create course' 
    }), { status: 500 });
  }
}

export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    const category = url.searchParams.get('category');
    const level = url.searchParams.get('level');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 12;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, u.name as instructor_name, p.avatar_url as instructor_avatar
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE c.status = 'published'
    `;
    
    const params = [];
    
    if (category) {
      query += ' AND c.category = ?';
      params.push(category);
    }
    
    if (level) {
      query += ' AND c.level = ?';
      params.push(level);
    }
    
    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const courses = await DB.prepare(query).bind(...params).all();

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM courses WHERE status = "published"';
    const countParams = [];
    
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    
    if (level) {
      countQuery += ' AND level = ?';
      countParams.push(level);
    }

    const totalCount = await DB.prepare(countQuery).bind(...countParams).first();

    return new Response(JSON.stringify({
      courses: courses.results,
      pagination: {
        page,
        totalPages: Math.ceil(totalCount.count / limit),
        totalItems: totalCount.count
      }
    }));

  } catch (error) {
    console.error('Error fetching courses:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch courses' 
    }), { status: 500 });
  }
}

// Enroll in course
export async function enrollInCourse(courseId: string, userId: string, env: any) {
  const { DB } = env;

  try {
    // Get course details
    const course = await DB.prepare(
      'SELECT * FROM courses WHERE id = ? AND status = "published"'
    ).bind(courseId).first();

    if (!course) {
      throw new Error('Course not found');
    }

    // Check if already enrolled
    const existingEnrollment = await DB.prepare(
      'SELECT id FROM course_enrollments WHERE course_id = ? AND user_id = ?'
    ).bind(courseId, userId).first();

    if (existingEnrollment) {
      throw new Error('Already enrolled in this course');
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: course.price,
      currency: 'usd',
      metadata: {
        course_id: courseId,
        user_id: userId,
        type: 'course_enrollment'
      }
    });

    return {
      success: true,
      paymentIntent: {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      },
      course: {
        id: course.id,
        title: course.title,
        price: course.price
      }
    };

  } catch (error) {
    console.error('Error creating course enrollment:', error);
    throw error;
  }
}

// Complete course enrollment after payment
export async function completeEnrollment(paymentIntentId: string, env: any) {
  const { DB } = env;

  try {
    // Verify payment
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not completed');
    }

    const { course_id: courseId, user_id: userId } = paymentIntent.metadata;

    // Create enrollment
    await DB.prepare(`
      INSERT INTO course_enrollments (
        course_id, user_id, stripe_payment_intent_id, status
      ) VALUES (?, ?, ?, 'active')
    `).bind(courseId, userId, paymentIntentId).run();

    // Update course enrollment count
    await DB.prepare(`
      UPDATE courses 
      SET enrollments_count = enrollments_count + 1,
          revenue_total = revenue_total + ?
      WHERE id = ?
    `).bind(paymentIntent.amount, courseId).run();

    // Create notification
    await DB.prepare(`
      INSERT INTO notifications (
        user_id, type, title, message, action_url
      ) VALUES (?, 'course_enrolled', 'Course Enrollment Confirmed', 
                'You have successfully enrolled in the course. Start learning now!', 
                '/courses/${courseId}')
    `).bind(userId).run();

    return { success: true };

  } catch (error) {
    console.error('Error completing enrollment:', error);
    throw error;
  }
}

// Get course content for enrolled users
export async function getCourseContent(courseId: string, userId: string, env: any) {
  const { DB } = env;

  try {
    // Verify enrollment or if user is instructor
    const access = await DB.prepare(`
      SELECT 'enrolled' as access_type FROM course_enrollments 
      WHERE course_id = ? AND user_id = ? AND status = 'active'
      UNION
      SELECT 'instructor' as access_type FROM courses 
      WHERE id = ? AND instructor_id = ?
    `).bind(courseId, userId, courseId, userId).first();

    if (!access) {
      return { error: 'Access denied', status: 403 };
    }

    // Get course with modules
    const course = await DB.prepare(`
      SELECT c.*, u.name as instructor_name, p.avatar_url as instructor_avatar
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE c.id = ?
    `).bind(courseId).first();

    const modules = await DB.prepare(`
      SELECT * FROM course_modules 
      WHERE course_id = ? 
      ORDER BY order_index ASC
    `).bind(courseId).all();

    // Get user's progress
    const enrollment = await DB.prepare(
      'SELECT progress_percentage FROM course_enrollments WHERE course_id = ? AND user_id = ?'
    ).bind(courseId, userId).first();

    return {
      course,
      modules: modules.results,
      progress: enrollment?.progress_percentage || 0,
      accessType: access.access_type
    };

  } catch (error) {
    console.error('Error fetching course content:', error);
    return { error: 'Failed to fetch course content', status: 500 };
  }
}
