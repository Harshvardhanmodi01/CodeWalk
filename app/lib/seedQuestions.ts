export interface SeedQuestion {
  id?: string;
  topic: string;
  category: 'technical' | 'behavioral' | 'logical';
  subcategory: string;
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expected_answer: any;
  tags: string[];
  is_ai_generated: boolean;
  created_by: string | null;
  usage_count: number;
}

const topicsData: Record<string, Array<{ q: string; d: 'easy' | 'medium' | 'hard'; sub: string; tags: string[] }>> = {
  "Python": [
    { q: "GIL in Python, multi-threading impact & bypass strategies.", d: "hard", sub: "programming-languages", tags: ["concurrency", "gil"] },
    { q: "Custom decorator that measures function execution time.", d: "medium", sub: "programming-languages", tags: ["decorators", "performance"] },
    { q: "List comprehensions vs generator expressions in Python.", d: "easy", sub: "programming-languages", tags: ["generators", "memory"] },
    { q: "Reference counting vs generational garbage collection in Python.", d: "hard", sub: "programming-languages", tags: ["memory", "gc"] },
    { q: "Deepcopy vs shallow copy of compound mutable objects.", d: "easy", sub: "programming-languages", tags: ["deepcopy", "copy"] },
    { q: "Exception handling differences between except and finally clauses.", d: "easy", sub: "programming-languages", tags: ["exceptions", "error-handling"] },
    { q: "Python MRO and the super() function in multiple inheritance.", d: "hard", sub: "programming-languages", tags: ["mro", "inheritance"] },
    { q: "Usage of *args and **kwargs in generic forwarding functions.", d: "easy", sub: "programming-languages", tags: ["args", "kwargs"] },
    { q: "Context managers: implementing __enter__ and __exit__ methods.", d: "medium", sub: "programming-languages", tags: ["context-manager", "with"] },
    { q: "list.sort() in-place sorting vs sorted() new list return.", d: "easy", sub: "programming-languages", tags: ["sorting", "timsort"] }
  ],
  "JavaScript": [
    { q: "Event Loop microtasks (Promises) vs macrotasks (setTimeout).", d: "hard", sub: "programming-languages", tags: ["event-loop", "asynchronous"] },
    { q: "Closures: scope preservation and state encapsulation.", d: "medium", sub: "programming-languages", tags: ["closures", "scopes"] },
    { q: "var vs let vs const: scope, hoisting, and Temporal Dead Zone.", d: "easy", sub: "programming-languages", tags: ["hoisting", "scope"] },
    { q: "Prototypal inheritance and walking the prototype chain.", d: "hard", sub: "programming-languages", tags: ["prototypes", "inheritance"] },
    { q: "Double equals (==) coercion vs strict triple equals (===).", d: "easy", sub: "programming-languages", tags: ["comparison", "coercion"] },
    { q: "Lexical binding of 'this' in arrow functions vs normal functions.", d: "medium", sub: "programming-languages", tags: ["this-binding", "arrow"] },
    { q: "Promise.all fail-fast vs Promise.allSettled full compliance.", d: "medium", sub: "concurrency", tags: ["promises"] },
    { q: "DOM Event Bubbling, Capturing, and preventDefault vs stopPropagation.", d: "medium", sub: "frontend", tags: ["dom", "events"] },
    { q: "Debounce (delay executions) vs Throttle (limit frequency) systems.", d: "medium", sub: "frontend", tags: ["performance", "debounce"] },
    { q: "Generator functions, yield statement, and next() protocol.", d: "hard", sub: "programming-languages", tags: ["generators", "iterators"] }
  ],
  "TypeScript": [
    { q: "Interface vs Type Alias: declaration merging and extension rules.", d: "easy", sub: "programming-languages", tags: ["interfaces", "types"] },
    { q: "Generics: creating reusable components with type parameters.", d: "medium", sub: "programming-languages", tags: ["generics", "reusability"] },
    { q: "Union types vs Intersection types and key matching logic.", d: "easy", sub: "programming-languages", tags: ["union", "intersection"] },
    { q: "Type Guarding using 'typeof', 'instanceof', and user-defined predicates.", d: "medium", sub: "programming-languages", tags: ["type-guards", "narrowing"] },
    { q: "Utility types: Partial, Readonly, Pick, and Omit implementation.", d: "easy", sub: "programming-languages", tags: ["utility-types", "helper"] },
    { q: "Keyof operator and Mapped Types for dynamic schemas.", d: "hard", sub: "programming-languages", tags: ["mapped-types", "keyof"] },
    { q: "Abstract classes vs Interfaces: implementation details and syntax.", d: "easy", sub: "programming-languages", tags: ["classes", "abstract"] },
    { q: "Conditional Types: infer keyword and dynamic return types.", d: "hard", sub: "programming-languages", tags: ["conditional-types", "infer"] },
    { q: "TypeScript Decorators: class, method, and property interception.", d: "hard", sub: "programming-languages", tags: ["decorators", "meta"] },
    { q: "Any vs Unknown: type safety and assertion requirement.", d: "easy", sub: "programming-languages", tags: ["any", "unknown"] }
  ],
  "React.js": [
    { q: "React Reconciliation algorithm and the virtual DOM diffing.", d: "hard", sub: "frontend", tags: ["virtual-dom", "diffing"] },
    { q: "useMemo vs useCallback: referential equality and performance.", d: "medium", sub: "frontend", tags: ["hooks", "performance"] },
    { q: "React state batching and updates in async vs sync code blocks.", d: "medium", sub: "frontend", tags: ["state", "batching"] },
    { q: "Custom React hooks: encapsulating event listeners or API queries.", d: "medium", sub: "frontend", tags: ["hooks", "custom"] },
    { q: "Context API vs Redux: prop drilling solutions and scaling limits.", d: "medium", sub: "frontend", tags: ["context", "redux"] },
    { q: "React 19 Server Components (RSC) vs Client Components.", d: "hard", sub: "frontend", tags: ["rsc", "nextjs"] },
    { q: "Strict Mode side-effects and double rendering in development.", d: "easy", sub: "frontend", tags: ["strict-mode", "debugging"] },
    { q: "useEffect cleanup functions: preventing memory leaks and duplicates.", d: "easy", sub: "frontend", tags: ["hooks", "cleanup"] },
    { q: "Error Boundaries: capturing runtime rendering errors safely.", d: "medium", sub: "frontend", tags: ["error-boundary", "exceptions"] },
    { q: "React.memo vs pure components: shallow prop comparisons.", d: "easy", sub: "frontend", tags: ["memo", "optimization"] }
  ],
  "Next.js": [
    { q: "App Router directory routing vs Pages Router convention.", d: "easy", sub: "frontend", tags: ["routing", "app-router"] },
    { q: "Server Actions: executing server database writes directly from client.", d: "hard", sub: "frontend", tags: ["server-actions", "forms"] },
    { q: "Static Site Generation (SSG) vs Server-Side Rendering (SSR).", d: "medium", sub: "frontend", tags: ["ssr", "ssg"] },
    { q: "Incremental Static Regeneration (ISR) configuration and revalidate.", d: "hard", sub: "frontend", tags: ["isr", "caching"] },
    { q: "Next.js middleware: cookies validation, routing, and redirects.", d: "medium", sub: "frontend", tags: ["middleware", "auth"] },
    { q: "Next.js Image component: layout optimization and lazy loading.", d: "easy", sub: "frontend", tags: ["optimization", "images"] },
    { q: "Dynamic imports and code-splitting with React.lazy.", d: "easy", sub: "frontend", tags: ["code-splitting", "performance"] },
    { q: "Next.js routing interceptors and parallel layouts.", d: "hard", sub: "frontend", tags: ["routing", "parallel-routes"] },
    { q: "Caching layers in Next.js: Fetch cache vs Route cache.", d: "hard", sub: "frontend", tags: ["caching", "performance"] },
    { q: "SEO tags injection and metadata layouts in Next.js.", d: "easy", sub: "frontend", tags: ["seo", "metadata"] }
  ],
  "Node.js": [
    { q: "Event Emitter pattern and custom listener implementation.", d: "medium", sub: "backend", tags: ["events", "design-pattern"] },
    { q: "Streams API: readable, writable, duplex, and piping big files.", d: "hard", sub: "backend", tags: ["streams", "files"] },
    { q: "Cluster module and fork child processes for CPU load balancing.", d: "hard", sub: "backend", tags: ["clustering", "scaling"] },
    { q: "Buffer class: binary data handling and performance comparison.", d: "medium", sub: "backend", tags: ["buffers", "memory"] },
    { q: "Asynchronous patterns: callbacks, promises, and async/await.", d: "easy", sub: "backend", tags: ["async", "promises"] },
    { q: "require (CommonJS) vs import (ESM) module system differences.", d: "easy", sub: "backend", tags: ["modules", "commonjs"] },
    { q: "Libuv pool size: executing async file systems and crypto operations.", d: "hard", sub: "backend", tags: ["libuv", "threadpool"] },
    { q: "Node.js memory leaks profiling using heap dumps and inspect.", d: "hard", sub: "backend", tags: ["memory-leak", "profiling"] },
    { q: "Handling process crashes using uncaughtException and exit code.", d: "medium", sub: "backend", tags: ["process", "error-handling"] },
    { q: "Node path utility: resolve vs join vs relative directories.", d: "easy", sub: "backend", tags: ["path", "filesystem"] }
  ],
  "SQL/PostgreSQL": [
    { q: "Database indexing: B-Tree vs Hash index structures and limits.", d: "hard", sub: "databases", tags: ["indexing", "performance"] },
    { q: "Transaction isolation levels: Read Committed vs Serializable.", d: "hard", sub: "databases", tags: ["transactions", "acid"] },
    { q: "Inner Join vs Left Join vs Full Join comparison.", d: "easy", sub: "databases", tags: ["joins", "queries"] },
    { q: "Window Functions: ROW_NUMBER() vs RANK() vs DENSE_RANK().", d: "medium", sub: "databases", tags: ["window-functions", "analytics"] },
    { q: "Explain Plan analysis: identifying sequential scans and index hits.", d: "hard", sub: "databases", tags: ["query-optimization", "explain"] },
    { q: "Primary Key vs Unique Key constraint differences.", d: "easy", sub: "databases", tags: ["keys", "constraints"] },
    { q: "ACID properties: Atomicity, Consistency, Isolation, Durability.", d: "medium", sub: "databases", tags: ["acid", "transactions"] },
    { q: "Foreign Keys: ON DELETE CASCADE vs ON DELETE SET NULL.", d: "easy", sub: "databases", tags: ["keys", "cascade"] },
    { q: "Database normalization: 1NF, 2NF, and 3NF database designs.", d: "medium", sub: "databases", tags: ["normalization", "design"] },
    { q: "PostgreSQL JSONB columns vs JSON text performance.", d: "medium", sub: "databases", tags: ["jsonb", "postgresql"] }
  ],
  "MongoDB": [
    { q: "NoSQL document store vs Relational databases, trade-offs.", d: "easy", sub: "databases", tags: ["nosql", "comparison"] },
    { q: "MongoDB indexing: Single Field vs Compound indexes, prefix rule.", d: "medium", sub: "databases", tags: ["indexing", "performance"] },
    { q: "Aggregation Pipeline: match, group, project, and lookup stages.", d: "hard", sub: "databases", tags: ["aggregation", "queries"] },
    { q: "Document referencing (joins) vs nesting (embedding) schema design.", d: "medium", sub: "databases", tags: ["schema-design", "embedding"] },
    { q: "Replica Sets: primary election, secondary syncing, high availability.", d: "hard", sub: "databases", tags: ["replication", "replica-set"] },
    { q: "Sharding: partition key selection and horizontal scaling.", d: "hard", sub: "databases", tags: ["sharding", "scaling"] },
    { q: "Mongoose middleware (pre/post hooks) and schema validations.", d: "medium", sub: "databases", tags: ["mongoose", "orm"] },
    { q: "Transactions in MongoDB: multi-document ACID transactions.", d: "hard", sub: "databases", tags: ["transactions", "acid"] },
    { q: "Cursor operations: skip, limit, and sort pagination optimization.", d: "easy", sub: "databases", tags: ["pagination", "performance"] },
    { q: "MongoDB Write Concerns: acknowledged, wmajority, and journaled.", d: "medium", sub: "databases", tags: ["write-concern", "replication"] }
  ],
  "System Design": [
    { q: "Rate Limiter design: Token Bucket vs Leaky Bucket algorithms.", d: "hard", sub: "cs-fundamentals", tags: ["rate-limiting", "scaling"] },
    { q: "Load Balancers: Round Robin vs Least Connections vs Layer 4/7.", d: "medium", sub: "cs-fundamentals", tags: ["load-balancing", "scaling"] },
    { q: "Database Sharding: horizontal scaling vs master-slave replication.", d: "hard", sub: "databases", tags: ["sharding", "replication"] },
    { q: "CDN systems: edge locations, cache invalidation, and latency.", d: "medium", sub: "cs-fundamentals", tags: ["cdn", "caching"] },
    { q: "Caching strategies: Write-Through vs Write-Back vs Cache-Aside.", d: "hard", sub: "cs-fundamentals", tags: ["caching", "memcached"] },
    { q: "Consistent Hashing: node mapping, virtual nodes, and routing.", d: "hard", sub: "cs-fundamentals", tags: ["hashing", "scaling"] },
    { q: "Microservices Architecture: API Gateway, service discovery, mesh.", d: "medium", sub: "cs-fundamentals", tags: ["microservices", "api-gateway"] },
    { q: "Horizontal scaling vs Vertical scaling CPU/RAM constraints.", d: "easy", sub: "cs-fundamentals", tags: ["scaling", "infrastructure"] },
    { q: "Monolithic vs Microservices modularity and maintenance.", d: "easy", sub: "cs-fundamentals", tags: ["architecture", "microservices"] },
    { q: "Message Queues: Kafka log offsets vs RabbitMQ push message routing.", d: "hard", sub: "cs-fundamentals", tags: ["message-queue", "kafka"] }
  ],
  "Data Structures": [
    { q: "Singly Linked List vs Doubly Linked List node links.", d: "easy", sub: "cs-fundamentals", tags: ["linked-list", "nodes"] },
    { q: "Hash Map collisions resolution: chaining vs open addressing.", d: "hard", sub: "cs-fundamentals", tags: ["hashmap", "collisions"] },
    { q: "Stack vs Queue: FIFO vs LIFO memory and pointers.", d: "easy", sub: "cs-fundamentals", tags: ["stack", "queue"] },
    { q: "Binary Search Tree (BST) properties and search complexity.", d: "medium", sub: "cs-fundamentals", tags: ["bst", "binary-tree"] },
    { q: "Array vs Linked List: cache locality and random access index.", d: "easy", sub: "cs-fundamentals", tags: ["array", "linked-list"] },
    { q: "Graph representation: Adjacency List vs Adjacency Matrix.", d: "medium", sub: "cs-fundamentals", tags: ["graphs", "adjacency"] },
    { q: "Trie data structure: autocomplete dictionary word prefix matching.", d: "hard", sub: "cs-fundamentals", tags: ["trie", "autocomplete"] },
    { q: "Min-Heap vs Max-Heap binary tree bubble up insertion logic.", d: "medium", sub: "cs-fundamentals", tags: ["heap", "priority-queue"] },
    { q: "Circular Queue implementation using modulo pointer math.", d: "medium", sub: "cs-fundamentals", tags: ["queue", "circular"] },
    { q: "Balanced Trees: AVL Tree vs Red-Black Tree rotation rules.", d: "hard", sub: "cs-fundamentals", tags: ["avl", "red-black"] }
  ],
  "Algorithms": [
    { q: "Binary Search algorithm implementation on sorted collections.", d: "easy", sub: "cs-fundamentals", tags: ["search", "binary-search"] },
    { q: "Quick Sort vs Merge Sort: recursion, time complexity, and memory.", d: "medium", sub: "cs-fundamentals", tags: ["sorting", "divide-and-conquer"] },
    { q: "Breadth-First Search (BFS) vs Depth-First Search (DFS) on graph.", d: "medium", sub: "cs-fundamentals", tags: ["graphs", "dfs-bfs"] },
    { q: "Dijkstra's shortest path algorithm: edge weights and relaxation.", d: "hard", sub: "cs-fundamentals", tags: ["dijkstra", "graphs"] },
    { q: "Dynamic Programming: memoization vs tabulation optimization.", d: "hard", sub: "cs-fundamentals", tags: ["dynamic-programming", "memoization"] },
    { q: "Sliding Window technique: sub-array maximums and string matches.", d: "medium", sub: "cs-fundamentals", tags: ["sliding-window", "array"] },
    { q: "Two Pointers approach: checking palindromes or reversing lists.", d: "easy", sub: "cs-fundamentals", tags: ["two-pointers", "in-place"] },
    { q: "Greedy Algorithms vs Dynamic Programming: optimal substructure.", d: "medium", sub: "cs-fundamentals", tags: ["greedy", "algorithms"] },
    { q: "Floyd's Cycle-Finding algorithm: slow and fast pointer loop.", d: "medium", sub: "cs-fundamentals", tags: ["cycle-detection", "pointers"] },
    { q: "Kruskal's vs Prim's Minimum Spanning Tree (MST) algorithms.", d: "hard", sub: "cs-fundamentals", tags: ["mst", "prim-kruskal"] }
  ],
  "REST APIs": [
    { q: "REST API HTTP Methods: GET, POST, PUT, DELETE, PATCH usage.", d: "easy", sub: "backend", tags: ["rest", "http"] },
    { q: "HTTP Status codes: 200 vs 201, 400 vs 401 vs 403, 500 series.", d: "easy", sub: "backend", tags: ["status-codes", "http"] },
    { q: "Idempotency in REST APIs: which HTTP methods are idempotent.", d: "medium", sub: "backend", tags: ["idempotency", "rest"] },
    { q: "REST API Pagination: Offset vs Cursor/Keyset pagination scaling.", d: "medium", sub: "backend", tags: ["pagination", "scaling"] },
    { q: "REST API Security: OAuth2, JWT tokens, and CORS configurations.", d: "medium", sub: "backend", tags: ["jwt", "cors"] },
    { q: "Rate limiting APIs: client headers (Retry-After, X-RateLimit).", d: "medium", sub: "backend", tags: ["rate-limiting", "headers"] },
    { q: "REST API versioning: URI versioning vs Custom Header versioning.", d: "easy", sub: "backend", tags: ["versioning", "rest"] },
    { q: "GraphQL vs REST APIs: over-fetching and under-fetching limits.", d: "medium", sub: "backend", tags: ["graphql", "comparison"] },
    { q: "Optimistic Locking vs Pessimistic Locking in concurrent APIs.", d: "hard", sub: "backend", tags: ["locking", "concurrency"] },
    { q: "REST API payload design: filtering, sorting, and nested models.", d: "easy", sub: "backend", tags: ["rest-design", "query"] }
  ],
  "Docker": [
    { q: "Docker Image vs Docker Container filesystem namespaces.", d: "easy", sub: "devops", tags: ["docker", "basics"] },
    { q: "Docker Multi-stage Builds: optimizing production image sizes.", d: "medium", sub: "devops", tags: ["multi-stage", "optimization"] },
    { q: "Docker Compose: local service dependencies, networks, volumes.", d: "medium", sub: "devops", tags: ["docker-compose", "networking"] },
    { q: "Docker Volume storage: Bind Mount vs Named Volume persistence.", d: "easy", sub: "devops", tags: ["volumes", "storage"] },
    { q: "Docker networking: Bridge vs Host vs Overlay network isolation.", d: "hard", sub: "devops", tags: ["networking", "networks"] },
    { q: "Caching Docker layers: instruction ordering in Dockerfile.", d: "medium", sub: "devops", tags: ["caching", "dockerfile"] },
    { q: "Running Docker rootless: security implications and UID maps.", d: "hard", sub: "devops", tags: ["security", "rootless"] },
    { q: "Docker entrypoint vs cmd instruction override hierarchy.", d: "easy", sub: "devops", tags: ["entrypoint", "cmd"] },
    { q: "Docker Swarm vs Kubernetes basic container orchestration.", d: "medium", sub: "devops", tags: ["orchestration", "swarm"] },
    { q: "Handling environment secrets in Docker run and Dockerfile.", d: "medium", sub: "devops", tags: ["secrets", "security"] }
  ],
  "Git": [
    { q: "Git Rebase vs Git Merge commit histories and conflict math.", d: "medium", sub: "devops", tags: ["rebase", "merge"] },
    { q: "Git cherry-pick: applying single commits to target branch.", d: "easy", sub: "devops", tags: ["cherry-pick", "commits"] },
    { q: "Git stash: saving local dirty workspace states temporarily.", d: "easy", sub: "devops", tags: ["stash", "workspace"] },
    { q: "Resolving Git merge conflicts: local markers and aborting.", d: "easy", sub: "devops", tags: ["conflicts", "merges"] },
    { q: "Git Fetch vs Git Pull: network synchronization difference.", d: "easy", sub: "devops", tags: ["fetch", "pull"] },
    { q: "Git Reflog: recovering deleted commits and branches.", d: "hard", sub: "devops", tags: ["reflog", "disaster-recovery"] },
    { q: "Git hook triggers: pre-commit and pre-push validation setups.", d: "medium", sub: "devops", tags: ["hooks", "pre-commit"] },
    { q: "Squash commits: cleaning up pull request branch merge histories.", d: "medium", sub: "devops", tags: ["squash", "pr"] },
    { q: "Git Reset (soft, mixed, hard) difference on working tree.", d: "hard", sub: "devops", tags: ["reset", "index"] },
    { q: "Git Submodules: managing embedded external repository links.", d: "hard", sub: "devops", tags: ["submodules", "subprojects"] }
  ],
  "OOPS Concepts": [
    { q: "Four Pillars of OOP: Encapsulation, Inheritance, Polymorphism, Abstraction.", d: "easy", sub: "cs-fundamentals", tags: ["oop", "theory"] },
    { q: "Method Overloading (static) vs Method Overriding (dynamic).", d: "easy", sub: "cs-fundamentals", tags: ["overloading", "overriding"] },
    { q: "Abstract Class vs Interface declarations and multi-implementations.", d: "medium", sub: "cs-fundamentals", tags: ["interfaces", "abstract"] },
    { q: "Composition vs Inheritance: dynamic runtime flexibility.", d: "medium", sub: "cs-fundamentals", tags: ["composition", "inheritance"] },
    { q: "Single Responsibility Principle (SRP) in class design.", d: "easy", sub: "cs-fundamentals", tags: ["solid", "srp"] },
    { q: "Interface Segregation Principle (ISP) SOLID refactoring.", d: "medium", sub: "cs-fundamentals", tags: ["solid", "isp"] },
    { q: "Open-Closed Principle (OCP): extending classes without edits.", d: "medium", sub: "cs-fundamentals", tags: ["solid", "ocp"] },
    { q: "Liskov Substitution Principle (LSP): subtypes constraints.", d: "hard", sub: "cs-fundamentals", tags: ["solid", "lsp"] },
    { q: "Dependency Inversion Principle (DIP) abstraction decoupling.", d: "medium", sub: "cs-fundamentals", tags: ["solid", "dip"] },
    { q: "Polymorphism: runtime method dispatch and vtable pointers.", d: "hard", sub: "cs-fundamentals", tags: ["polymorphism", "vtable"] }
  ],
  "Operating Systems": [
    { q: "Process vs Thread memory sharing, context switch cost.", d: "easy", sub: "cs-fundamentals", tags: ["process", "thread"] },
    { q: "Virtual Memory: paging, page tables, page faults, thrashing.", d: "hard", sub: "cs-fundamentals", tags: ["paging", "memory"] },
    { q: "CPU Scheduling: Shortest Job First vs Round Robin queues.", d: "medium", sub: "cs-fundamentals", tags: ["scheduling", "cpu"] },
    { q: "Deadlocks: four Coffman conditions and prevention strategies.", d: "hard", sub: "cs-fundamentals", tags: ["deadlock", "coffman"] },
    { q: "Mutex vs Semaphore synchronization: ownership difference.", d: "medium", sub: "cs-fundamentals", tags: ["mutex", "semaphore"] },
    { q: "System Calls: user space to kernel space mode transitions.", d: "hard", sub: "cs-fundamentals", tags: ["syscall", "kernel"] },
    { q: "Memory fragmentation: internal vs external, compaction.", d: "medium", sub: "cs-fundamentals", tags: ["fragmentation", "compaction"] },
    { q: "RAID arrays: striping vs mirroring performance differences.", d: "easy", sub: "cs-fundamentals", tags: ["raid", "storage"] },
    { q: "Context Switch: saving register values and reload queues.", d: "medium", sub: "cs-fundamentals", tags: ["context-switch", "concurrency"] },
    { q: "Inter-Process Communication (IPC): pipes vs sockets vs shared memory.", d: "hard", sub: "cs-fundamentals", tags: ["ipc", "sockets"] }
  ],
  "Computer Networks": [
    { q: "OSI Model: 7 Layers and their corresponding network protocols.", d: "easy", sub: "cs-fundamentals", tags: ["osi", "protocols"] },
    { q: "TCP 3-way handshake sequence and connection termination.", d: "medium", sub: "cs-fundamentals", tags: ["tcp", "handshake"] },
    { q: "TCP (connection-oriented) vs UDP (connectionless) comparison.", d: "easy", sub: "cs-fundamentals", tags: ["tcp", "udp"] },
    { q: "DNS Resolution: recursive vs iterative queries, cache.", d: "medium", sub: "cs-fundamentals", tags: ["dns", "queries"] },
    { q: "HTTP vs HTTPS: SSL/TLS handshake and asymmetric encryption.", d: "medium", sub: "cs-fundamentals", tags: ["https", "ssl"] },
    { q: "IP Addressing: IPv4 subnetting vs IPv6 address spaces.", d: "hard", sub: "cs-fundamentals", tags: ["ipv4", "subnetting"] },
    { q: "HTTP/1.1 pipelining vs HTTP/2 multiplexing vs HTTP/3 QUIC.", d: "hard", sub: "cs-fundamentals", tags: ["http2", "quic"] },
    { q: "NAT (Network Address Translation): private to public IPs.", d: "medium", sub: "cs-fundamentals", tags: ["nat", "routing"] },
    { q: "WebSockets vs Server-Sent Events (SSE): bi-directional streaming.", d: "medium", sub: "cs-fundamentals", tags: ["websockets", "sse"] },
    { q: "ARP (Address Resolution Protocol): IP to MAC mapping.", d: "easy", sub: "cs-fundamentals", tags: ["arp", "mac"] }
  ],
  "Django": [
    { q: "Django MVT (Model-View-Template) pattern architecture.", d: "easy", sub: "backend", tags: ["django", "mvt"] },
    { q: "Django ORM: lazy evaluation, select_related vs prefetch_related.", d: "hard", sub: "backend", tags: ["orm", "n-plus-one"] },
    { q: "Django Middleware: request/response interception lifecycle.", d: "medium", sub: "backend", tags: ["middleware", "lifecycle"] },
    { q: "Django migrations: makemigrations vs migrate dependency resolution.", d: "easy", sub: "backend", tags: ["migrations", "cli"] },
    { q: "Custom Django managers: overriding get_queryset() for filters.", d: "medium", sub: "backend", tags: ["managers", "queryset"] },
    { q: "Django REST Framework (DRF) serializers and validators.", d: "medium", sub: "backend", tags: ["drf", "serialization"] },
    { q: "Django session management: cookies, database-backed sessions.", d: "easy", sub: "backend", tags: ["sessions", "cookies"] },
    { q: "Django class-based views (CBV) vs function-based views (FBV).", d: "easy", sub: "backend", tags: ["views", "cbv"] },
    { q: "Django signal receivers: post_save triggers and loops risk.", d: "medium", sub: "backend", tags: ["signals", "triggers"] },
    { q: "Django security: CSRF token generation, XSS, and SQL injection.", d: "hard", sub: "backend", tags: ["security", "csrf"] }
  ],
  "Java": [
    { q: "JVM, JRE, and JDK differences, bytecode execution flows.", d: "easy", sub: "programming-languages", tags: ["jvm", "architecture"] },
    { q: "Garbage Collection algorithms in Java: G1GC vs ZGC execution.", d: "hard", sub: "programming-languages", tags: ["gc", "memory"] },
    { q: "String constant pool: reference equality of literal strings.", d: "easy", sub: "programming-languages", tags: ["strings", "memory"] },
    { q: "HashMap internal details: bucket array, entry node trees.", d: "hard", sub: "programming-languages", tags: ["hashmap", "buckets"] },
    { q: "Checked Exceptions (compile-time) vs Unchecked Exceptions.", d: "easy", sub: "programming-languages", tags: ["exceptions", "error-handling"] },
    { q: "Java multi-threading: synchronized blocks vs ReentrantLock.", d: "medium", sub: "programming-languages", tags: ["concurrency", "locks"] },
    { q: "Functional interfaces: Lambda expressions and Stream API.", d: "medium", sub: "programming-languages", tags: ["streams", "lambdas"] },
    { q: "Java Generics type erasure: runtime JVM signatures limits.", d: "hard", sub: "programming-languages", tags: ["generics", "type-erasure"] },
    { q: "Abstract classes vs Interfaces default methods differences.", d: "easy", sub: "programming-languages", tags: ["interfaces", "abstract"] },
    { q: "Java ClassLoader delegation model: bootstrap, extension, app.", d: "hard", sub: "programming-languages", tags: ["classloader", "security"] }
  ],
  "CSS/Tailwind": [
    { q: "CSS Box Model: margin, border, padding, and box-sizing.", d: "easy", sub: "frontend", tags: ["box-model", "css"] },
    { q: "Flexbox vs Grid: 1D layout distribution vs 2D structural grid.", d: "easy", sub: "frontend", tags: ["flexbox", "grid"] },
    { q: "CSS specificity hierarchy: id, class, element, inline calculations.", d: "easy", sub: "frontend", tags: ["specificity", "selectors"] },
    { q: "Tailwind CSS Utility-first concept: compilation and PurgeCSS.", d: "medium", sub: "frontend", tags: ["tailwind", "compilation"] },
    { q: "Position properties: absolute vs relative vs fixed vs sticky.", d: "easy", sub: "frontend", tags: ["position", "layout"] },
    { q: "CSS variables (custom properties) vs Sass preprocessor variables.", d: "medium", sub: "frontend", tags: ["variables", "sass"] },
    { q: "Flexbox alignment: justify-content vs align-items vs align-self.", d: "easy", sub: "frontend", tags: ["flexbox", "alignment"] },
    { q: "Tailwind custom configs: theme extensions and plugins.", d: "medium", sub: "frontend", tags: ["tailwind", "configs"] },
    { q: "CSS Transitions vs Keyframe Animations performance and timelines.", d: "medium", sub: "frontend", tags: ["animations", "keyframes"] },
    { q: "Responsive design: CSS media queries vs Tailwind breakpoints.", d: "easy", sub: "frontend", tags: ["responsive", "media-queries"] }
  ],
  "Behavioral": [
    { q: "Describe a time you had a conflict with a peer developer and how you reached a resolution.", d: "medium", sub: "behavioral", tags: ["conflict-resolution", "teamwork"] },
    { q: "How do you handle scope creep or sudden changes in project requirements from product managers?", d: "medium", sub: "behavioral", tags: ["adaptability", "communication"] },
    { q: "Tell me about a time you made a major technical mistake. How did you identify it and what did you learn?", d: "hard", sub: "behavioral", tags: ["problem-solving", "accountability"] },
    { q: "Describe a scenario where you had to explain a complex technical concept to a non-technical stakeholder.", d: "easy", sub: "behavioral", tags: ["communication", "stakeholder-management"] },
    { q: "How do you prioritize multiple tasks with competing deadlines in a fast-paced team environment?", d: "easy", sub: "behavioral", tags: ["time-management", "prioritization"] },
    { q: "Tell me about a time you proactively improved a team process or system architecture.", d: "medium", sub: "behavioral", tags: ["leadership", "proactivity"] },
    { q: "How do you handle constructive criticism on your code during peer review?", d: "easy", sub: "behavioral", tags: ["teamwork", "growth-mindset"] },
    { q: "Describe a situation where you had to work with a teammate who was not contributing their fair share.", d: "medium", sub: "behavioral", tags: ["collaboration", "resolution"] },
    { q: "How do you stay motivated and keep up with rapidly changing technologies in your field?", d: "easy", sub: "behavioral", tags: ["continuous-learning", "motivation"] },
    { q: "Tell me about a time you had to lead a project under tight constraints and successfully delivered it.", d: "hard", sub: "behavioral", tags: ["project-management", "leadership"] }
  ],
  "Logical": [
    { q: "A farmer has 17 sheep. All but 9 die. How many are left?", d: "easy", sub: "logical", tags: ["riddle", "attention-to-detail"] },
    { q: "If a clock strikes 6 times in 5 seconds, how many seconds will it take to strike 12 times?", d: "hard", sub: "logical", tags: ["math", "intervals"] },
    { q: "Two programmers can write 2 programs in 2 days. How many programmers are needed to write 10 programs in 10 days?", d: "medium", sub: "logical", tags: ["ratio", "math"] },
    { q: "You have 8 identical-looking coins, one of which is slightly heavier. How can you find it using a balance scale only twice?", d: "hard", sub: "logical", tags: ["puzzles", "binary-search"] },
    { q: "If a doctor gives you 3 pills and tells you to take one every half hour, how long will they last?", d: "easy", sub: "logical", tags: ["intervals", "riddle"] },
    { q: "A project has a 90% chance of passing testing and an 80% chance of launch. What is the joint probability?", d: "medium", sub: "logical", tags: ["probability", "math"] },
    { q: "A box contains 5 red balls and 5 blue balls. What is the minimum number of balls to draw to guarantee a matching pair?", d: "easy", sub: "logical", tags: ["combinatorics", "probability"] },
    { q: "Three switches in the cellar correspond to three lightbulbs in the attic. You can make only one trip. How to map them?", d: "hard", sub: "logical", tags: ["puzzles", "lateral-thinking"] },
    { q: "A company doubles its database size every month. It takes 12 months to fill the server. When was the server half full?", d: "medium", sub: "logical", tags: ["exponentials", "math"] },
    { q: "If five machines take five minutes to make five widgets, how long would it take a hundred machines to make a hundred widgets?", d: "easy", sub: "logical", tags: ["riddle", "ratio"] }
  ]
};

const getQuestions = (): SeedQuestion[] => {
  const list: SeedQuestion[] = [];
  
  for (const [topic, qs] of Object.entries(topicsData)) {
    qs.forEach((item, index) => {
      let category: 'technical' | 'behavioral' | 'logical' = 'technical';
      if (topic === 'Behavioral') category = 'behavioral';
      else if (topic === 'Logical') category = 'logical';

      const expectedAnswerObj = {
        ideal_explanation: `A strong candidate should explain "${item.q}" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.`,
        key_concepts: item.tags.concat(["best practices", "performance"]),
        correct_approach: `The correct technical approach for "${item.q}" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).`,
        follow_up_if_struggle: `Can you describe a scenario where you had to debug or scale an issue related to "${item.q}" in your past work?`,
        red_flags: [
          `Fails to explain basic concepts of ${topic}`,
          `Unaware of performance trade-offs or memory leaks`,
          `Relies entirely on textbook definitions without hands-on reasoning`
        ]
      };
      
      list.push({
        id: `seed-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${index}`,
        topic,
        category,
        subcategory: item.sub,
        question_text: item.q,
        difficulty: item.d,
        expected_answer: expectedAnswerObj,
        tags: item.tags,
        is_ai_generated: false,
        created_by: null,
        usage_count: 0
      });
    });
  }
  
  return list;
};

export const seedQuestions = getQuestions();
