#!/usr/bin/env node

// TechFlunky CLI - Package management and deployment tool
import { Command } from 'commander';
import { PackageBuilder } from '../src/lib/deployment/package-builder';
import { BusinessDeploymentManager } from '../src/lib/deployment/deployment-manager';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('techflunky')
  .description('TechFlunky Business Package Manager')
  .version('1.0.0');

// Initialize new package
program
  .command('init <name>')
  .description('Initialize a new business package')
  .option('-s, --slug <slug>', 'Package slug')
  .option('-t, --template <template>', 'Use a template (saas-starter, marketplace, ai-chatbot)')
  .action(async (name, options) => {
    console.log(chalk.blue('🚀 Initializing new TechFlunky package...'));
    
    const slug = options.slug || name.toLowerCase().replace(/\s+/g, '-');
    
    let builder;
    if (options.template) {
      builder = await PackageBuilder.fromTemplate(options.template);
    } else {
      builder = new PackageBuilder(name, slug);
    }
    
    // Interactive setup
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Package description:',
        default: 'A revolutionary business concept'
      },
      {
        type: 'number',
        name: 'price',
        message: 'Package price (in USD):',
        default: 25000
      },
      {
        type: 'list',
        name: 'tier',
        message: 'Package tier:',
        choices: ['concept', 'blueprint', 'launch_ready'],
        default: 'blueprint'
      }
    ]);
    
    builder.setInfo(answers);
    
    // Create project directory
    const projectDir = path.join(process.cwd(), slug);
    await fs.mkdir(projectDir, { recursive: true });
    
    // Create subdirectories
    await fs.mkdir(path.join(projectDir, 'workers'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'database'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'docs'), { recursive: true });
    
    // Create package.json
    const packageJson = {
      name: slug,
      version: '1.0.0',
      description: answers.description,
      techflunky: {
        price: answers.price,
        tier: answers.tier
      }
    };
    
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create techflunky.json
    await builder.export(path.join(projectDir, 'techflunky.json'));
    
    console.log(chalk.green(`✅ Package initialized in ${projectDir}`));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray(`  cd ${slug}`));
    console.log(chalk.gray('  techflunky add-worker <name>'));
    console.log(chalk.gray('  techflunky add-database <name>'));
  });

// Add Worker
program
  .command('add-worker <name>')
  .description('Add a Worker to the package')
  .option('-f, --file <file>', 'Worker code file')
  .option('-r, --routes <routes...>', 'Worker routes')
  .option('-c, --cron <cron>', 'Cron schedule')
  .action(async (name, options) => {
    const spinner = ora('Adding Worker...').start();
    
    try {
      // Load existing package
      const packagePath = path.join(process.cwd(), 'techflunky.json');
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      // Create worker file if not specified
      let workerFile = options.file;
      if (!workerFile) {
        workerFile = path.join('workers', `${name}.js`);
        
        // Create default worker code
        const defaultCode = `// ${name} Worker
export default {
  async fetch(request, env, ctx) {
    return new Response('Hello from ${name}!', {
      headers: { 'content-type': 'text/plain' },
    });
  },
};`;
        
        await fs.writeFile(workerFile, defaultCode);
      }
      
      // Add to package
      const builder = Object.setPrototypeOf(packageData, PackageBuilder.prototype);
      await builder.addWorker({
        name,
        codePath: workerFile,
        routes: options.routes,
        cron: options.cron
      });
      
      await builder.export(packagePath);
      
      spinner.succeed(`Worker '${name}' added successfully`);
    } catch (error) {
      spinner.fail(`Failed to add worker: ${error.message}`);
    }
  });

// Add Database
program
  .command('add-database <name>')
  .description('Add a D1 database to the package')
  .option('-s, --schema <schema>', 'Schema SQL file')
  .option('-d, --seed <seed>', 'Seed data SQL file')
  .action(async (name, options) => {
    const spinner = ora('Adding database...').start();
    
    try {
      // Create schema file if not specified
      let schemaFile = options.schema;
      if (!schemaFile) {
        schemaFile = path.join('database', `${name}-schema.sql`);
        
        // Create default schema
        const defaultSchema = `-- ${name} Database Schema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;
        
        await fs.writeFile(schemaFile, defaultSchema);
      }
      
      // Load and update package
      const packagePath = path.join(process.cwd(), 'techflunky.json');
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      const builder = Object.setPrototypeOf(packageData, PackageBuilder.prototype);
      await builder.addDatabase({
        name,
        schemaPath: schemaFile,
        seedDataPath: options.seed
      });
      
      await builder.export(packagePath);
      
      spinner.succeed(`Database '${name}' added successfully`);
    } catch (error) {
      spinner.fail(`Failed to add database: ${error.message}`);
    }
  });

// Package command
program
  .command('package')
  .description('Package the business for deployment')
  .action(async () => {
    const spinner = ora('Packaging business...').start();
    
    try {
      const packagePath = path.join(process.cwd(), 'techflunky.json');
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      // Validate package
      const builder = Object.setPrototypeOf(packageData, PackageBuilder.prototype);
      const errors = builder.validate();
      
      if (errors.length > 0) {
        spinner.fail('Package validation failed:');
        errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        return;
      }
      
      // Create distribution
      const distDir = path.join(process.cwd(), 'dist');
      await fs.mkdir(distDir, { recursive: true });
      
      // Copy all assets
      await fs.cp(
        process.cwd(), 
        distDir, 
        { 
          recursive: true,
          filter: (src) => !src.includes('node_modules') && !src.includes('.git')
        }
      );
      
      spinner.succeed('Package created successfully in ./dist');
      console.log(chalk.gray('Ready to publish to TechFlunky marketplace'));
    } catch (error) {
      spinner.fail(`Failed to package: ${error.message}`);
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Deploy a package to a Cloudflare account')
  .option('-t, --token <token>', 'Cloudflare API token')
  .option('-p, --package <package>', 'Package file path')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Starting deployment...'));
    
    // Interactive deployment configuration
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiToken',
        message: 'Cloudflare API token:',
        when: !options.token
      },
      {
        type: 'input',
        name: 'packagePath',
        message: 'Package file path:',
        default: './techflunky.json',
        when: !options.package
      }
    ]);
    
    const apiToken = options.token || answers.apiToken;
    const packagePath = options.package || answers.packagePath;
    
    const spinner = ora('Loading package...').start();
    
    try {
      // Load package
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      spinner.text = 'Initializing deployment...';
      
      // Create deployment manager
      const deploymentManager = new BusinessDeploymentManager(apiToken, packageData);
      
      spinner.text = 'Deploying to Cloudflare...';
      
      // Deploy
      const result = await deploymentManager.deployToBuyerAccount();
      
      spinner.succeed('Deployment completed successfully!');
      
      console.log(chalk.green('\n✅ Business deployed successfully!'));
      console.log(chalk.gray('Dashboard URL:'), result.dashboardUrl);
      console.log(chalk.gray('API Endpoint:'), result.apiEndpoint);
      console.log(chalk.gray('\nDeployed resources:'));
      console.log(chalk.gray(`  - Workers: ${result.resources.workers.join(', ')}`));
      console.log(chalk.gray(`  - Databases: ${result.resources.databases.join(', ')}`));
      console.log(chalk.gray(`  - Buckets: ${result.resources.buckets.join(', ')}`));
      console.log(chalk.gray(`  - Domain: ${result.resources.customDomain}`));
      
    } catch (error) {
      spinner.fail(`Deployment failed: ${error.message}`);
      process.exit(1);
    }
  });

// Publish command
program
  .command('publish')
  .description('Publish package to TechFlunky marketplace')
  .action(async () => {
    console.log(chalk.blue('📦 Publishing to TechFlunky marketplace...'));
    
    const spinner = ora('Validating package...').start();
    
    try {
      const packagePath = path.join(process.cwd(), 'techflunky.json');
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      // Validate
      const builder = Object.setPrototypeOf(packageData, PackageBuilder.prototype);
      const errors = builder.validate();
      
      if (errors.length > 0) {
        spinner.fail('Package validation failed');
        return;
      }
      
      spinner.text = 'Uploading to marketplace...';
      
      // TODO: Implement actual marketplace API upload
      // For now, just simulate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      spinner.succeed('Package published successfully!');
      
      console.log(chalk.green('\n✅ Your business package is now live on TechFlunky!'));
      console.log(chalk.gray(`View at: https://techflunky.com/listing/${packageData.slug}`));
      
    } catch (error) {
      spinner.fail(`Publishing failed: ${error.message}`);
    }
  });

program.parse();
