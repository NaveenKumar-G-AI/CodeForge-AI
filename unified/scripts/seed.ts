/**
 * CodeForge AI — Database Seed Script
 *
 * Seeds the database with initial data for development and testing.
 */

import { createDatabaseClient } from '../src/db/client.js';
import type { UUID } from '../src/domain/types.js';

async function seedDatabase(): Promise<void> {
  console.log('Seeding database...');

  const db = createDatabaseClient();

  try {
    const healthy = await db.healthCheck();
    if (!healthy) {
      throw new Error('Database connection failed');
    }
    console.log('Database connection established');

    // Seed career domains
    await seedCareerDomains(db);

    // Seed role families
    await seedRoleFamilies(db);

    // Seed roles
    await seedRoles(db);

    // Seed competencies
    await seedCompetencies(db);

    // Seed skills
    await seedSkills(db);

    // Seed technologies
    await seedTechnologies(db);

    // Seed role links
    await seedRoleLinks(db);

    // Seed challenges
    await seedChallenges(db);

    // Seed diagnostic blueprints
    await seedDiagnosticBlueprints(db);

    // Seed interview blueprints
    await seedInterviewBlueprints(db);

    // Seed incident blueprints
    await seedIncidentBlueprints(db);

    // Seed projects
    await seedProjects(db);

    console.log('\n✓ Database seeded successfully');
  } finally {
    await db.close();
  }
}

async function seedCareerDomains(db: any): Promise<void> {
  console.log('Seeding career domains...');
  const domains = [
    { slug: 'software-engineering', name: 'Software Engineering', description: 'Building software systems and applications' },
    { slug: 'data-science', name: 'Data Science & ML', description: 'Extracting insights from data and building ML models' },
    { slug: 'devops', name: 'DevOps & Infrastructure', description: 'Operating and automating infrastructure' },
    { slug: 'security', name: 'Security Engineering', description: 'Protecting systems and data' },
    { slug: 'product', name: 'Product Engineering', description: 'Building user-facing products' },
  ];

  for (const d of domains) {
    await db.query(`
      INSERT INTO career_domain (slug, name, description, status)
      VALUES ($1, $2, $3, 'ACTIVE')
      ON CONFLICT (slug) DO NOTHING
    `, [d.slug, d.name, d.description]);
  }
}

async function seedRoleFamilies(db: any): Promise<void> {
  console.log('Seeding role families...');
  const families = [
    { slug: 'backend', name: 'Backend Engineering', description: 'Server-side systems and APIs', domainSlug: 'software-engineering' },
    { slug: 'frontend', name: 'Frontend Engineering', description: 'Client-side applications', domainSlug: 'software-engineering' },
    { slug: 'fullstack', name: 'Full Stack Engineering', description: 'End-to-end application development', domainSlug: 'software-engineering' },
    { slug: 'mobile', name: 'Mobile Engineering', description: 'Native and cross-platform mobile apps', domainSlug: 'software-engineering' },
    { slug: 'ml-engineering', name: 'ML Engineering', description: 'Production ML systems', domainSlug: 'data-science' },
    { slug: 'data-engineering', name: 'Data Engineering', description: 'Data pipelines and infrastructure', domainSlug: 'data-science' },
    { slug: 'platform', name: 'Platform Engineering', description: 'Internal developer platforms', domainSlug: 'devops' },
    { slug: 'sre', name: 'Site Reliability Engineering', description: 'Reliability and observability', domainSlug: 'devops' },
    { slug: 'appsec', name: 'Application Security', description: 'Secure software development', domainSlug: 'security' },
    { slug: 'product-engineer', name: 'Product Engineer', description: 'Full-stack product development', domainSlug: 'product' },
  ];

  for (const f of families) {
    const domain = await db.queryOne('SELECT id FROM career_domain WHERE slug = $1', [f.domainSlug]);
    if (domain) {
      await db.query(`
        INSERT INTO role_family (slug, name, description, career_domain_id, status)
        VALUES ($1, $2, $3, $4, 'ACTIVE')
        ON CONFLICT (slug) DO NOTHING
      `, [f.slug, f.name, f.description, domain.id]);
    }
  }
}

async function seedRoles(db: any): Promise<void> {
  console.log('Seeding roles...');
  const roles = [
    { slug: 'backend-engineer', name: 'Backend Engineer', familySlug: 'backend', description: 'Designs and builds server-side systems' },
    { slug: 'senior-backend-engineer', name: 'Senior Backend Engineer', familySlug: 'backend', description: 'Leads complex backend systems' },
    { slug: 'frontend-engineer', name: 'Frontend Engineer', familySlug: 'frontend', description: 'Builds user interfaces and experiences' },
    { slug: 'fullstack-engineer', name: 'Full Stack Engineer', familySlug: 'fullstack', description: 'Works across the entire stack' },
    { slug: 'mobile-engineer', name: 'Mobile Engineer', familySlug: 'mobile', description: 'Builds iOS and Android applications' },
    { slug: 'ml-engineer', name: 'ML Engineer', familySlug: 'ml-engineering', description: 'Deploys and operates ML models' },
    { slug: 'data-engineer', name: 'Data Engineer', familySlug: 'data-engineering', description: 'Builds data pipelines and warehouses' },
    { slug: 'platform-engineer', name: 'Platform Engineer', familySlug: 'platform', description: 'Builds internal developer tools' },
    { slug: 'sre', name: 'Site Reliability Engineer', familySlug: 'sre', description: 'Ensures system reliability' },
    { slug: 'appsec-engineer', name: 'Application Security Engineer', familySlug: 'appsec', description: 'Secures applications' },
    { slug: 'product-engineer', name: 'Product Engineer', familySlug: 'product-engineer', description: 'End-to-end product development' },
  ];

  for (const r of roles) {
    const family = await db.queryOne('SELECT id FROM role_family WHERE slug = $1', [r.familySlug]);
    if (family) {
      await db.query(`
        INSERT INTO role (slug, role_family_id, status, current_version)
        VALUES ($1, $2, 'ACTIVE', 1)
        ON CONFLICT (slug) DO NOTHING
      `, [r.slug, family.id]);

      // Create role version
      const role = await db.queryOne('SELECT id FROM role WHERE slug = $1', [r.slug]);
      if (role) {
        await db.query(`
          INSERT INTO role_version (role_id, version, name, short_description, long_description, status)
          VALUES ($1, 1, $2, $3, $4, 'ACTIVE')
          ON CONFLICT (role_id, version) DO NOTHING
        `, [role.id, r.name, r.description, `Detailed description for ${r.name}`]);
      }
    }
  }
}

async function seedCompetencies(db: any): Promise<void> {
  console.log('Seeding competencies...');
  const competencies = [
    { slug: 'programming-fundamentals', name: 'Programming Fundamentals', description: 'Core programming concepts' },
    { slug: 'data-structures-algorithms', name: 'Data Structures & Algorithms', description: 'Algorithmic problem solving' },
    { slug: 'system-design', name: 'System Design', description: 'Designing scalable systems' },
    { slug: 'databases', name: 'Databases', description: 'Database design and optimization' },
    { slug: 'api-design', name: 'API Design', description: 'REST, GraphQL, gRPC APIs' },
    { slug: 'testing', name: 'Testing', description: 'Unit, integration, e2e testing' },
    { slug: 'devops', name: 'DevOps & CI/CD', description: 'Deployment and operations' },
    { slug: 'security', name: 'Security', description: 'Application security practices' },
    { slug: 'performance', name: 'Performance Optimization', description: 'Profiling and optimization' },
    { slug: 'ml-fundamentals', name: 'ML Fundamentals', description: 'Machine learning concepts' },
  ];

  for (const c of competencies) {
    await db.query(`
      INSERT INTO competency (slug, name, description, status)
      VALUES ($1, $2, $3, 'ACTIVE')
      ON CONFLICT (slug) DO NOTHING
    `, [c.slug, c.name, c.description]);
  }
}

async function seedSkills(db: any): Promise<void> {
  console.log('Seeding skills...');
  const skills = [
    // Programming Fundamentals
    { slug: 'variables-types', name: 'Variables & Types', competencySlug: 'programming-fundamentals', description: 'Understanding variables, data types, and type systems' },
    { slug: 'control-flow', name: 'Control Flow', competencySlug: 'programming-fundamentals', description: 'Conditionals, loops, and branching' },
    { slug: 'functions', name: 'Functions', competencySlug: 'programming-fundamentals', description: 'Function definition, parameters, return values' },
    { slug: 'error-handling', name: 'Error Handling', competencySlug: 'programming-fundamentals', description: 'Exceptions, error propagation, recovery' },
    { slug: 'debugging', name: 'Debugging', competencySlug: 'programming-fundamentals', description: 'Debugging techniques and tools' },

    // Data Structures & Algorithms
    { slug: 'arrays-strings', name: 'Arrays & Strings', competencySlug: 'data-structures-algorithms', description: 'Array and string manipulation' },
    { slug: 'hash-maps', name: 'Hash Maps', competencySlug: 'data-structures-algorithms', description: 'Hash table operations and applications' },
    { slug: 'linked-lists', name: 'Linked Lists', competencySlug: 'data-structures-algorithms', description: 'Linked list operations' },
    { slug: 'stacks-queues', name: 'Stacks & Queues', competencySlug: 'data-structures-algorithms', description: 'LIFO and FIFO data structures' },
    { slug: 'trees', name: 'Trees', competencySlug: 'data-structures-algorithms', description: 'Binary trees, BST, traversals' },
    { slug: 'graphs', name: 'Graphs', competencySlug: 'data-structures-algorithms', description: 'Graph algorithms and traversals' },
    { slug: 'sorting-searching', name: 'Sorting & Searching', competencySlug: 'data-structures-algorithms', description: 'Sorting algorithms and binary search' },
    { slug: 'dynamic-programming', name: 'Dynamic Programming', competencySlug: 'data-structures-algorithms', description: 'DP patterns and optimization' },
    { slug: 'greedy', name: 'Greedy Algorithms', competencySlug: 'data-structures-algorithms', description: 'Greedy algorithm patterns' },
    { slug: 'recursion-backtracking', name: 'Recursion & Backtracking', competencySlug: 'data-structures-algorithms', description: 'Recursive problem solving' },

    // System Design
    { slug: 'scalability', name: 'Scalability Patterns', competencySlug: 'system-design', description: 'Horizontal/vertical scaling, caching' },
    { slug: 'distributed-systems', name: 'Distributed Systems', competencySlug: 'system-design', description: 'Consensus, replication, partitioning' },
    { slug: 'microservices', name: 'Microservices', competencySlug: 'system-design', description: 'Service decomposition, communication' },
    { slug: 'caching', name: 'Caching Strategies', competencySlug: 'system-design', description: 'Cache patterns and invalidation' },
    { slug: 'message-queues', name: 'Message Queues', competencySlug: 'system-design', description: 'Async communication patterns' },

    // Databases
    { slug: 'sql', name: 'SQL', competencySlug: 'databases', description: 'Relational databases and queries' },
    { slug: 'nosql', name: 'NoSQL', competencySlug: 'databases', description: 'Document, key-value, graph databases' },
    { slug: 'database-design', name: 'Database Design', competencySlug: 'databases', description: 'Schema design, normalization' },
    { slug: 'query-optimization', name: 'Query Optimization', competencySlug: 'databases', description: 'Indexes, execution plans' },

    // API Design
    { slug: 'rest-apis', name: 'REST APIs', competencySlug: 'api-design', description: 'RESTful API design' },
    { slug: 'graphql', name: 'GraphQL', competencySlug: 'api-design', description: 'GraphQL schemas and resolvers' },
    { slug: 'grpc', name: 'gRPC', competencySlug: 'api-design', description: 'Protocol buffers and gRPC' },

    // Testing
    { slug: 'unit-testing', name: 'Unit Testing', competencySlug: 'testing', description: 'Unit test frameworks and patterns' },
    { slug: 'integration-testing', name: 'Integration Testing', competencySlug: 'testing', description: 'Integration test strategies' },
    { slug: 'e2e-testing', name: 'E2E Testing', competencySlug: 'testing', description: 'End-to-end test automation' },
    { slug: 'test-design', name: 'Test Design', competencySlug: 'testing', description: 'Test case design techniques' },

    // DevOps
    { slug: 'containerization', name: 'Containerization', competencySlug: 'devops', description: 'Docker, container orchestration' },
    { slug: 'kubernetes', name: 'Kubernetes', competencySlug: 'devops', description: 'K8s deployment and management' },
    { slug: 'ci-cd', name: 'CI/CD', competencySlug: 'devops', description: 'Continuous integration and deployment' },
    { slug: 'infrastructure-as-code', name: 'Infrastructure as Code', competencySlug: 'devops', description: 'Terraform, CloudFormation' },
    { slug: 'monitoring', name: 'Monitoring & Observability', competencySlug: 'devops', description: 'Metrics, logs, traces' },

    // Security
    { slug: 'auth-authz', name: 'Authentication & Authorization', competencySlug: 'security', description: 'Auth patterns, OAuth, JWT' },
    { slug: 'secure-coding', name: 'Secure Coding', competencySlug: 'security', description: 'OWASP, vulnerability prevention' },
    { slug: 'crypto', name: 'Cryptography', competencySlug: 'security', description: 'Encryption, hashing, signatures' },

    // Performance
    { slug: 'profiling', name: 'Profiling', competencySlug: 'performance', description: 'CPU, memory profiling' },
    { slug: 'optimization', name: 'Code Optimization', competencySlug: 'performance', description: 'Algorithm and code optimization' },

    // ML Fundamentals
    { slug: 'supervised-learning', name: 'Supervised Learning', competencySlug: 'ml-fundamentals', description: 'Regression, classification' },
    { slug: 'unsupervised-learning', name: 'Unsupervised Learning', competencySlug: 'ml-fundamentals', description: 'Clustering, dimensionality reduction' },
    { slug: 'model-evaluation', name: 'Model Evaluation', competencySlug: 'ml-fundamentals', description: 'Metrics, validation, bias' },
    { slug: 'feature-engineering', name: 'Feature Engineering', competencySlug: 'ml-fundamentals', description: 'Feature selection, transformation' },
  ];

  for (const s of skills) {
    const competency = await db.queryOne('SELECT id FROM competency WHERE slug = $1', [s.competencySlug]);
    if (competency) {
      await db.query(`
        INSERT INTO skill (slug, name, description, competency_id, status)
        VALUES ($1, $2, $3, $4, 'ACTIVE')
        ON CONFLICT (slug) DO NOTHING
      `, [s.slug, s.name, s.description, competency.id]);
    }
  }
}

async function seedTechnologies(db: any): Promise<void> {
  console.log('Seeding technologies...');
  const technologies = [
    { slug: 'python', name: 'Python', description: 'General-purpose programming language', type: 'LANGUAGE' },
    { slug: 'javascript', name: 'JavaScript', description: 'Web programming language', type: 'LANGUAGE' },
    { slug: 'typescript', name: 'TypeScript', description: 'Typed JavaScript', type: 'LANGUAGE' },
    { slug: 'java', name: 'Java', description: 'JVM language', type: 'LANGUAGE' },
    { slug: 'go', name: 'Go', description: 'Concurrent systems language', type: 'LANGUAGE' },
    { slug: 'rust', name: 'Rust', description: 'Systems programming language', type: 'LANGUAGE' },
    { slug: 'cpp', name: 'C++', description: 'Systems programming language', type: 'LANGUAGE' },
    { slug: 'react', name: 'React', description: 'Frontend UI library', type: 'FRAMEWORK' },
    { slug: 'vue', name: 'Vue', description: 'Progressive frontend framework', type: 'FRAMEWORK' },
    { slug: 'nextjs', name: 'Next.js', description: 'React full-stack framework', type: 'FRAMEWORK' },
    { slug: 'django', name: 'Django', description: 'Python web framework', type: 'FRAMEWORK' },
    { slug: 'fastapi', name: 'FastAPI', description: 'Modern Python web framework', type: 'FRAMEWORK' },
    { slug: 'spring-boot', name: 'Spring Boot', description: 'Java application framework', type: 'FRAMEWORK' },
    { slug: 'express', name: 'Express', description: 'Node.js web framework', type: 'FRAMEWORK' },
    { slug: 'postgresql', name: 'PostgreSQL', description: 'Relational database', type: 'DATABASE' },
    { slug: 'mysql', name: 'MySQL', description: 'Relational database', type: 'DATABASE' },
    { slug: 'mongodb', name: 'MongoDB', description: 'Document database', type: 'DATABASE' },
    { slug: 'redis', name: 'Redis', description: 'In-memory data store', type: 'DATABASE' },
    { slug: 'docker', name: 'Docker', description: 'Containerization platform', type: 'TOOL' },
    { slug: 'kubernetes', name: 'Kubernetes', description: 'Container orchestration', type: 'TOOL' },
    { slug: 'aws', name: 'AWS', description: 'Cloud platform', type: 'PLATFORM' },
    { slug: 'gcp', name: 'GCP', description: 'Cloud platform', type: 'PLATFORM' },
    { slug: 'github-actions', name: 'GitHub Actions', description: 'CI/CD platform', type: 'TOOL' },
    { slug: 'gitlab-ci', name: 'GitLab CI', description: 'CI/CD platform', type: 'TOOL' },
    { slug: 'prometheus', name: 'Prometheus', description: 'Metrics monitoring', type: 'TOOL' },
    { slug: 'grafana', name: 'Grafana', description: 'Observability dashboards', type: 'TOOL' },
    { slug: 'terraform', name: 'Terraform', description: 'Infrastructure as code', type: 'TOOL' },
  ];

  for (const t of technologies) {
    await db.query(`
      INSERT INTO technology (slug, name, description, type, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      ON CONFLICT (slug) DO NOTHING
    `, [t.slug, t.name, t.description, t.type]);
  }
}

async function seedRoleLinks(db: any): Promise<void> {
  console.log('Seeding role links...');
  // This would link roles to competencies, skills, technologies
  // Simplified for brevity
}

async function seedChallenges(db: any): Promise<void> {
  console.log('Seeding challenges...');
  // Get some skill IDs
  const skills = await db.queryAll('SELECT id, slug FROM skill LIMIT 20');

  for (const skill of skills) {
    const challenge = {
      title: `${skill.slug} Challenge`,
      description: `Practice challenge for ${skill.slug}`,
      primary_skill_id: skill.id,
      difficulty_level: 'EASY',
      difficulty_score: 3.0,
      concept_difficulty: 2,
      implementation_complexity: 2,
      constraint_complexity: 2,
      reasoning_complexity: 2,
      ambiguity: 2,
      context_type: 'STANDARD',
      harness_type: 'function',
      languages_supported: ['python'],
      status: 'ACTIVE',
      is_verification: false,
      prompt: `Write a function to solve this ${skill.slug} problem.`,
      function_name: 'solve',
      starter_code: JSON.stringify({ python: 'def solve():\n    pass\n' }),
      hints: JSON.stringify(['Think about the base case', 'Consider edge cases']),
      solution_metadata: JSON.stringify({ referenceSolution: { python: 'def solve():\n    return 42\n' }, approachSummary: 'Simple solution', timeComplexity: 'O(1)', spaceComplexity: 'O(1)' }),
      evaluation_metadata: JSON.stringify({ entryFunction: 'solve', comparisonMode: 'exact' }),
      quality_status: 'APPROVED',
      quality_analytics: JSON.stringify({ attemptCount: 0, passRate: 0, avgHintsUsed: 0, avgCompletionMs: 0, lastUpdated: new Date().toISOString() }),
    };

    await db.query(`
      INSERT INTO challenge (title, description, primary_skill_id, difficulty_level, difficulty_score,
        concept_difficulty, implementation_complexity, constraint_complexity, reasoning_complexity, ambiguity,
        context_type, harness_type, languages_supported, status, is_verification, prompt, function_name,
        starter_code, hints, solution_metadata, evaluation_metadata, quality_status, quality_analytics)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT DO NOTHING
    `, [
      challenge.title, challenge.description, challenge.primary_skill_id, challenge.difficulty_level,
      challenge.difficulty_score, challenge.concept_difficulty, challenge.implementation_complexity,
      challenge.constraint_complexity, challenge.reasoning_complexity, challenge.ambiguity,
      challenge.context_type, challenge.harness_type, challenge.languages_supported, challenge.status,
      challenge.is_verification, challenge.prompt, challenge.function_name, challenge.starter_code,
      challenge.hints, challenge.solution_metadata, challenge.evaluation_metadata, challenge.quality_status,
      challenge.quality_analytics,
    ]);
  }
}

async function seedDiagnosticBlueprints(db: any): Promise<void> {
  console.log('Seeding diagnostic blueprints...');
  // Would insert diagnostic session templates
}

async function seedInterviewBlueprints(db: any): Promise<void> {
  console.log('Seeding interview blueprints...');
  const blueprints = [
    {
      name: 'Standard Technical Interview',
      type: 'GUIDED_TECHNICAL_INTERVIEW',
      version: 1,
      competencies: ['data-structures-algorithms', 'system-design', 'programming-fundamentals'],
      problem_count: 3,
      duration_minutes: 60,
      assistance_policy: JSON.stringify({ maxHints: 3, hintLevels: ['NONE', 'CLARIFICATION', 'CONCEPTUAL_DIRECTION'], allowSolutionView: false }),
      scoring: JSON.stringify({ dimensions: ['problem_solving', 'communication', 'code_quality'], weights: { problem_solving: 0.4, communication: 0.3, code_quality: 0.3 }, passThreshold: 0.7 }),
    },
    {
      name: 'Senior Engineer Interview',
      type: 'STRICT_TECHNICAL_INTERVIEW',
      version: 1,
      competencies: ['system-design', 'distributed-systems', 'databases', 'api-design'],
      problem_count: 2,
      duration_minutes: 90,
      assistance_policy: JSON.stringify({ maxHints: 1, hintLevels: ['NONE', 'CLARIFICATION'], allowSolutionView: false }),
      scoring: JSON.stringify({ dimensions: ['architecture', 'tradeoffs', 'communication'], weights: { architecture: 0.5, tradeoffs: 0.3, communication: 0.2 }, passThreshold: 0.75 }),
    },
  ];

  for (const b of blueprints) {
    await db.query(`
      INSERT INTO interview_blueprint (name, type, version, competencies, problem_count, duration_minutes, assistance_policy, scoring)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `, [b.name, b.type, b.version, b.competencies, b.problem_count, b.duration_minutes, b.assistance_policy, b.scoring]);
  }
}

async function seedIncidentBlueprints(db: any): Promise<void> {
  console.log('Seeding incident blueprints...');
  const blueprints = [
    {
      name: 'Database Connection Pool Exhaustion',
      description: 'Application unable to acquire database connections',
      severity: 'SEV2',
      initial_phase: 'DETECTION',
      services: ['api', 'database'],
      runbooks: JSON.stringify({ database: 'Check connection pool settings, look for connection leaks' }),
      injects: JSON.stringify({ errorRate: 0.5, latencyP99: 5000 }),
    },
    {
      name: 'Memory Leak in Worker Process',
      description: 'Background job workers consuming increasing memory',
      severity: 'SEV2',
      initial_phase: 'DETECTION',
      services: ['worker', 'queue'],
      runbooks: JSON.stringify({ worker: 'Profile memory usage, check for unclosed resources' }),
      injects: JSON.stringify({ memoryGrowthRate: '100MB/hour', oomKills: 3 }),
    },
  ];

  for (const b of blueprints) {
    await db.query(`
      INSERT INTO incident_blueprint (name, description, severity, initial_phase, services, runbooks, injects)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
    `, [b.name, b.description, b.severity, b.initial_phase, b.services, b.runbooks, b.injects]);
  }
}

async function seedProjects(db: any): Promise<void> {
  console.log('Seeding projects...');
  const projects = [
    {
      title: 'REST API Service',
      description: 'Build a RESTful API with authentication, validation, and testing',
      type: 'BACKEND_SERVICE',
      requirements: JSON.stringify([
        { id: crypto.randomUUID(), description: 'Implement CRUD for resources', priority: 'MUST_HAVE', category: 'Functionality', acceptanceCriteria: ['GET /resources returns list', 'POST /resources creates resource'] },
        { id: crypto.randomUUID(), description: 'Add JWT authentication', priority: 'MUST_HAVE', category: 'Security', acceptanceCriteria: ['Protected routes require valid token', 'Invalid tokens rejected'] },
      ]),
      rubric: JSON.stringify({
        categories: [
          { category: 'correctness', weight: 0.35, criteria: [{ id: 'c1', description: 'All endpoints work correctly', points: 35, severity: 'high' }] },
          { category: 'architecture', weight: 0.20, criteria: [{ id: 'a1', description: 'Clean separation of concerns', points: 20, severity: 'medium' }] },
          { category: 'code_quality', weight: 0.15, criteria: [{ id: 'q1', description: 'Consistent style, good naming', points: 15, severity: 'low' }] },
          { category: 'testing', weight: 0.15, criteria: [{ id: 't1', description: 'Unit and integration tests', points: 15, severity: 'high' }] },
          { category: 'documentation', weight: 0.05, criteria: [{ id: 'd1', description: 'API documentation', points: 5, severity: 'low' }] },
          { category: 'security', weight: 0.05, criteria: [{ id: 's1', description: 'No obvious vulnerabilities', points: 5, severity: 'critical' }] },
          { category: 'performance', weight: 0.05, criteria: [{ id: 'p1', description: 'Reasonable response times', points: 5, severity: 'low' }] },
        ],
        weights: { correctness: 0.35, architecture: 0.20, code_quality: 0.15, testing: 0.15, documentation: 0.05, security: 0.05, performance: 0.05 },
      }),
      constraints: ['Use TypeScript', 'Use Express or Fastify', 'PostgreSQL database'],
      tech_stack: ['TypeScript', 'Node.js', 'PostgreSQL', 'JWT'],
      starter_files: JSON.stringify({ 'package.json': '{ "scripts": { "start": "node dist/index.js" } }', 'src/index.ts': '// TODO: Implement' }),
      time_limit_minutes: 120,
      difficulty: 'INTERMEDIATE',
      skills: [],
    },
    {
      title: 'React Dashboard',
      description: 'Build a data visualization dashboard with React',
      type: 'FRONTEND_APP',
      requirements: JSON.stringify([
        { id: crypto.randomUUID(), description: 'Display charts and metrics', priority: 'MUST_HAVE', category: 'Functionality', acceptanceCriteria: ['Line chart renders', 'Bar chart renders'] },
        { id: crypto.randomUUID(), description: 'Responsive layout', priority: 'SHOULD_HAVE', category: 'UX', acceptanceCriteria: ['Works on mobile', 'Works on desktop'] },
      ]),
      rubric: JSON.stringify({
        categories: [
          { category: 'correctness', weight: 0.35, criteria: [{ id: 'c1', description: 'Components render correctly', points: 35, severity: 'high' }] },
          { category: 'architecture', weight: 0.20, criteria: [{ id: 'a1', description: 'Component composition', points: 20, severity: 'medium' }] },
          { category: 'code_quality', weight: 0.15, criteria: [{ id: 'q1', description: 'TypeScript types, hooks usage', points: 15, severity: 'low' }] },
          { category: 'testing', weight: 0.15, criteria: [{ id: 't1', description: 'Component tests', points: 15, severity: 'high' }] },
          { category: 'documentation', weight: 0.05, criteria: [{ id: 'd1', description: 'Storybook stories', points: 5, severity: 'low' }] },
          { category: 'security', weight: 0.05, criteria: [{ id: 's1', description: 'No XSS vulnerabilities', points: 5, severity: 'critical' }] },
          { category: 'performance', weight: 0.05, criteria: [{ id: 'p1', description: 'Optimized renders', points: 5, severity: 'low' }] },
        ],
        weights: { correctness: 0.35, architecture: 0.20, code_quality: 0.15, testing: 0.15, documentation: 0.05, security: 0.05, performance: 0.05 },
      }),
      constraints: ['Use React 18', 'Use TypeScript', 'Use a charting library'],
      tech_stack: ['React', 'TypeScript', 'Recharts', 'Vite'],
      starter_files: JSON.stringify({ 'package.json': '{ "scripts": { "dev": "vite" } }', 'src/App.tsx': '// TODO: Implement' }),
      time_limit_minutes: 90,
      difficulty: 'INTERMEDIATE',
      skills: [],
    },
  ];

  for (const p of projects) {
    await db.query(`
      INSERT INTO project (title, description, type, requirements, rubric, constraints, tech_stack, starter_files, time_limit_minutes, difficulty, skills)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT DO NOTHING
    `, [p.title, p.description, p.type, p.requirements, p.rubric, p.constraints, p.tech_stack, p.starter_files, p.time_limit_minutes, p.difficulty, p.skills]);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch(error => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { seedDatabase };