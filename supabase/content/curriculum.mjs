// =====================================================================
// DOrSU IT Quest — seed curriculum
// Edit this file, then run `npm run db:seed` to regenerate supabase/seed.sql
//
// Question helpers (correct options are prefixed with "*"):
//   mcq(prompt, options, explanation, extra)
//   tf(prompt, true|false, explanation, extra)
//   multi(prompt, options, explanation, extra)
//   short(prompt, acceptedAnswers, explanation, extra)
//   code(prompt, codeSnippet, acceptedAnswers, explanation, extra)
//   order(prompt, itemsInCorrectOrder, explanation, extra)
// extra = { d: difficulty 1-3, topic, code, points }
// =====================================================================

export const mcq = (prompt, options, explanation, extra = {}) => ({ kind: 'mcq', prompt, options, explanation, ...extra })
export const tf = (prompt, value, explanation, extra = {}) => ({ kind: 'truefalse', prompt, value, explanation, ...extra })
export const multi = (prompt, options, explanation, extra = {}) => ({ kind: 'multi', prompt, options, explanation, ...extra })
export const short = (prompt, accepted, explanation, extra = {}) => ({ kind: 'short', prompt, accepted, explanation, ...extra })
export const code = (prompt, snippet, accepted, explanation, extra = {}) => ({ kind: 'code', prompt, code: snippet, accepted, explanation, ...extra })
export const order = (prompt, items, explanation, extra = {}) => ({ kind: 'order', prompt, items, explanation, ...extra })

// ---------------------------------------------------------------------
// NETWORKING
// ---------------------------------------------------------------------
const networking = {
  slug: 'networking',
  name: 'Networking',
  short_name: 'NET',
  description: 'Topologies, OSI & TCP/IP models, IP addressing, subnetting, protocols and ports.',
  icon: 'network',
  color: '#0EA5E9',
  quests: [
    {
      key: 'net-fundamentals', title: 'Network Fundamentals', type: 'quiz', difficulty: 1, xp: 60,
      description: 'Devices, topologies, media and network types — the building blocks of every network.',
      questions: [
        mcq('Which topology connects every device to a single central switch or hub?', ['*Star', 'Bus', 'Ring', 'Mesh'],
          'In a star topology every node has its own cable to a central device. If one cable fails, only that node is affected.', { topic: 'Topologies' }),
        mcq('Which device forwards packets between different networks using IP addresses?', ['*Router', 'Switch', 'Hub', 'Repeater'],
          'Routers work at Layer 3 and use routing tables to choose the best path between networks.', { topic: 'Devices' }),
        mcq('A network that covers a single building or computer laboratory is called a:', ['*LAN', 'WAN', 'MAN', 'PAN'],
          'A Local Area Network (LAN) covers a small geographic area such as a room, lab or building.', { topic: 'Network types' }),
        tf('A switch operates mainly at OSI Layer 2 and forwards frames using MAC addresses.', true,
          'Switches learn MAC addresses on each port and forward frames only to the port where the destination lives.', { topic: 'Devices' }),
        multi('Which of the following are guided (wired) transmission media? Select all that apply.',
          ['*Twisted-pair cable', '*Fiber-optic cable', '*Coaxial cable', 'Microwave', 'Infrared'],
          'Guided media carry signals along a physical path. Microwave and infrared are unguided (wireless).', { topic: 'Media', d: 2 }),
        mcq('Which UTP cable category is commonly used for Gigabit Ethernet up to 100 meters?', ['*Cat6', 'Cat3', 'Cat1', 'RG-6'],
          'Cat5e and Cat6 support 1 Gbps up to 100 m. Cat3 tops out at 10 Mbps; RG-6 is coaxial.', { topic: 'Media', d: 2 }),
        short('How many bits long is a MAC address? (number only)', ['48', '48 bits'],
          'A MAC address is 48 bits, written as six pairs of hexadecimal digits, e.g. 00:1A:2B:3C:4D:5E.', { topic: 'Addressing' }),
      ],
    },
    {
      key: 'net-models', title: 'OSI & TCP/IP Models', type: 'simulation', difficulty: 2, xp: 80,
      description: 'Simulate how data travels down the stack: arrange layers, encapsulation and the TCP handshake.',
      questions: [
        order('Arrange the OSI layers from Layer 7 (top) down to Layer 1 (bottom).',
          ['Application', 'Presentation', 'Session', 'Transport', 'Network', 'Data Link', 'Physical'],
          'Mnemonic (top-down): "All People Seem To Need Data Processing".', { topic: 'OSI model', d: 2 }),
        order('Arrange the protocol data units (PDUs) in the order they are created during encapsulation.',
          ['Data', 'Segment', 'Packet', 'Frame', 'Bits'],
          'Transport adds a header to make a segment, Network makes a packet, Data Link makes a frame, Physical sends bits.', { topic: 'Encapsulation', d: 2 }),
        mcq('At which OSI layer does the Internet Protocol (IP) operate?', ['*Network', 'Transport', 'Data Link', 'Session'],
          'IP handles logical addressing and routing — the responsibilities of Layer 3, the Network layer.', { topic: 'OSI model' }),
        order('Arrange the steps of the TCP three-way handshake.', ['SYN', 'SYN-ACK', 'ACK'],
          'The client sends SYN, the server replies SYN-ACK, and the client confirms with ACK. Then data can flow.', { topic: 'TCP', d: 2 }),
        mcq("Which TCP/IP model layer covers the OSI's Session, Presentation and Application layers?", ['*Application', 'Transport', 'Internet', 'Network Access'],
          'The 4-layer TCP/IP model merges the top three OSI layers into a single Application layer.', { topic: 'TCP/IP model', d: 2 }),
        multi('Which protocols operate at the Transport layer? Select all that apply.', ['*TCP', '*UDP', 'HTTP', 'ICMP'],
          'TCP and UDP are transport protocols. HTTP is Application layer; ICMP is Network layer.', { topic: 'Protocols', d: 2 }),
        mcq('Which device works only at OSI Layer 1 and repeats incoming signals out of every port?', ['*Hub', 'Switch', 'Router', 'Firewall'],
          'A hub has no intelligence about addresses — it simply regenerates the electrical signal on all ports.', { topic: 'Devices' }),
      ],
    },
    {
      key: 'net-subnetting', title: 'IP Addressing & Subnetting', type: 'simulation', difficulty: 3, xp: 100, time: 600,
      description: 'Calculate masks, network and broadcast addresses like a real network administrator.',
      questions: [
        short('What is the subnet mask (dotted decimal) for a /26 prefix?', ['255.255.255.192'],
          '/26 = 26 one-bits → the last octet has 2 network bits: 128 + 64 = 192.', { topic: 'Subnet masks', d: 2 }),
        short('How many usable host addresses are in a /27 subnet?', ['30'],
          '/27 leaves 5 host bits: 2^5 = 32 addresses − 2 (network + broadcast) = 30 usable hosts.', { topic: 'Host count', d: 2 }),
        short('What is the network address of 192.168.10.77/26?', ['192.168.10.64'],
          '/26 subnets go in blocks of 64 (0, 64, 128, 192). 77 falls in the 64–127 block, so the network is 192.168.10.64.', { topic: 'Network address', d: 3 }),
        short('What is the broadcast address of 172.16.5.130/25?', ['172.16.5.255'],
          '/25 blocks are 128 wide (0–127, 128–255). 130 is in 128–255, so the broadcast is 172.16.5.255.', { topic: 'Broadcast address', d: 3 }),
        mcq('Which of these is a private IPv4 address (RFC 1918)?', ['*10.25.3.1', '172.32.0.1', '192.169.1.1', '11.0.0.1'],
          'Private ranges: 10.0.0.0/8, 172.16.0.0/12 (172.16–172.31) and 192.168.0.0/16. 172.32.x.x is public.', { topic: 'Private addressing', d: 2 }),
        short('What is the longest prefix (e.g. /26) that still gives at least 50 usable hosts?', ['/26', '26'],
          '/26 gives 62 usable hosts (64 − 2). /27 gives only 30, which is too few.', { topic: 'VLSM', d: 3 }),
        mcq('What is the default subnet mask of a Class C network?', ['*255.255.255.0', '255.255.0.0', '255.0.0.0', '255.255.255.255'],
          'Class C addresses (192–223 first octet) use a default /24 mask.', { topic: 'Classful addressing' }),
        short('What is the first usable host address of 10.0.0.32/28?', ['10.0.0.33'],
          '/28 blocks are 16 wide: 10.0.0.32 is the network, so the first usable host is .33 (and the last is .46).', { topic: 'Host range', d: 3 }),
      ],
    },
    {
      key: 'net-boss', title: 'Protocols & Ports Boss Challenge', type: 'challenge', difficulty: 3, xp: 120, time: 240,
      description: 'Timed boss round. Know your ports and protocols cold — finish fast for a speed bonus!',
      questions: [
        mcq('What is the default port number for HTTPS?', ['*443', '80', '21', '8080'], 'HTTP uses 80; HTTPS (HTTP over TLS) uses 443.', { topic: 'Ports' }),
        mcq('Which protocol automatically assigns IP addresses to hosts on a network?', ['*DHCP', 'DNS', 'ARP', 'FTP'],
          'DHCP follows the DORA process: Discover, Offer, Request, Acknowledge.', { topic: 'Protocols' }),
        mcq('What is the main role of DNS?', ['*Resolve domain names to IP addresses', 'Encrypt web traffic', 'Assign MAC addresses', 'Route packets between networks'],
          'DNS is the "phonebook" of the Internet: it translates names like dorsu.edu.ph into IP addresses.', { topic: 'Protocols' }),
        mcq('Which protocol uses port 22 for secure remote login?', ['*SSH', 'Telnet', 'FTP', 'SMTP'],
          'SSH (22) encrypts the session. Telnet (23) sends everything — including passwords — in plain text.', { topic: 'Ports', d: 2 }),
        tf('UDP guarantees the delivery and ordering of packets.', false,
          'UDP is connectionless and best-effort. TCP is the protocol that provides reliable, ordered delivery.', { topic: 'Transport', d: 2 }),
        mcq('Which protocol maps an IPv4 address to a MAC address on the local network?', ['*ARP', 'RARP', 'ICMP', 'NAT'],
          'ARP broadcasts "Who has 192.168.1.1?" and the owner replies with its MAC address.', { topic: 'Protocols', d: 2 }),
        multi('Which protocols are used for sending or retrieving e-mail? Select all that apply.', ['*SMTP', '*IMAP', '*POP3', 'SNMP'],
          'SMTP sends mail; IMAP and POP3 retrieve it. SNMP is for network device management.', { topic: 'Protocols', d: 3 }),
        mcq('The ping command relies on which protocol?', ['*ICMP', 'TCP', 'UDP', 'IGMP'],
          'ping sends ICMP Echo Request messages and waits for Echo Replies.', { topic: 'Troubleshooting', d: 2 }),
      ],
    },
  ],
  pretest: [
    mcq('Which device connects different networks and selects the best path for data?', ['*Router', 'Switch', 'Hub', 'Access point'], 'Routers operate at Layer 3 and make path decisions.'),
    mcq('Which OSI layer is responsible for reliable end-to-end delivery?', ['*Transport', 'Network', 'Session', 'Physical'], 'The Transport layer (TCP) handles segmentation, acknowledgments and retransmission.'),
    short('How many usable hosts are in a /24 network?', ['254'], '2^8 = 256 addresses − 2 = 254 usable hosts.'),
    mcq('Port 53 is used by which service?', ['*DNS', 'DHCP', 'HTTP', 'SMTP'], 'DNS uses port 53 (UDP for queries, TCP for zone transfers).'),
    mcq('In which topology is every node directly connected to every other node?', ['*Mesh', 'Star', 'Bus', 'Ring'], 'A full mesh gives maximum redundancy but needs many links.'),
    short('What is the network address of 192.168.1.200/27?', ['192.168.1.192'], '/27 blocks are 32 wide; 200 falls in 192–223.', { d: 3 }),
    tf('IPv6 addresses are 128 bits long.', true, 'IPv4 uses 32 bits; IPv6 uses 128 bits.'),
    mcq('Which cable type is immune to electromagnetic interference?', ['*Fiber-optic', 'UTP', 'STP', 'Coaxial'], 'Fiber carries light, not electricity, so EMI does not affect it.'),
    mcq('Which transport protocol is connectionless?', ['*UDP', 'TCP', 'HTTP', 'FTP'], 'UDP sends datagrams without setting up a connection.'),
    mcq('What is a default gateway?', ['*The router interface hosts use to reach other networks', 'The DNS server address', 'The switch management IP', 'The broadcast address of the subnet'],
      'Traffic destined outside the local subnet is sent to the default gateway.'),
  ],
}

// ---------------------------------------------------------------------
// PROGRAMMING
// ---------------------------------------------------------------------
const programming = {
  slug: 'programming',
  name: 'Programming',
  short_name: 'PROG',
  description: 'Variables, control flow, functions, arrays and object-oriented programming through code tracing.',
  icon: 'code',
  color: '#8B5CF6',
  quests: [
    {
      key: 'prog-basics', title: 'Programming Basics', type: 'quiz', difficulty: 1, xp: 60,
      description: 'Data types, operators and variables — trace small programs and predict their output.',
      questions: [
        mcq('Which data type is best for storing the value 3.14?', ['*float', 'int', 'str', 'bool'], 'Numbers with a decimal part are floating-point values.', { topic: 'Data types' }),
        code('What is printed?', 'x = 7\ny = 2\nprint(x // y, x % y)', ['3 1'],
          '// is floor division (7 // 2 = 3) and % is the remainder (7 % 2 = 1).', { topic: 'Operators', d: 2 }),
        mcq('In Python 3, what is the result of 10 / 4?', ['*2.5', '2', '2.0', '3'], 'The / operator always performs true division and returns a float.', { topic: 'Operators' }),
        tf('In Python, variable names are case-sensitive (Score and score are different variables).', true,
          'Python (like Java and C) treats uppercase and lowercase letters as different characters in identifiers.', { topic: 'Variables' }),
        mcq('Which operator checks whether two values are equal?', ['*==', '=', '!=', '=>'], '= assigns a value; == compares two values.', { topic: 'Operators' }),
        code('What is printed?', 'print("IT" * 3)', ['ITITIT'], 'Multiplying a string by an integer repeats it.', { topic: 'Strings' }),
        multi('Which of the following are valid Python variable names? Select all that apply.', ['*student_name', '*_count', '2nd_place', '*totalScore', 'class'],
          'Names cannot start with a digit and cannot be reserved keywords like class.', { topic: 'Variables', d: 2 }),
      ],
    },
    {
      key: 'prog-control', title: 'Control Flow Tracing', type: 'simulation', difficulty: 2, xp: 80,
      description: 'Step through loops and conditions like a debugger. Trace execution and predict the output.',
      questions: [
        code('Trace the loop. What is printed?', 'total = 0\nfor i in range(1, 5):\n    total += i\nprint(total)', ['10'],
          'range(1, 5) yields 1, 2, 3, 4 → 1 + 2 + 3 + 4 = 10. The stop value 5 is excluded.', { topic: 'Loops', d: 2 }),
        code('What is printed?', 'n = 15\nif n % 3 == 0 and n % 5 == 0:\n    print("FizzBuzz")\nelif n % 3 == 0:\n    print("Fizz")\nelse:\n    print(n)', ['FizzBuzz'],
          '15 is divisible by both 3 and 5, so the first branch runs.', { topic: 'Conditions' }),
        code('What is printed?', 'count = 0\nwhile count < 10:\n    count += 3\nprint(count)', ['12'],
          'count goes 0 → 3 → 6 → 9 → 12. When it reaches 12 the condition fails and the loop stops.', { topic: 'Loops', d: 2 }),
        order('Arrange the lines to correctly compute and print 5! (factorial of 5).',
          ['result = 1', 'for i in range(1, 6):', '    result *= i', 'print(result)'],
          'Initialize the accumulator, loop 1..5 multiplying, then print once after the loop (prints 120).', { topic: 'Algorithms', d: 2 }),
        mcq('How many times does the body of `for i in range(2, 10, 3):` run?', ['*3', '2', '4', '8'],
          'range(2, 10, 3) yields 2, 5, 8 — three values.', { topic: 'Loops', d: 2 }),
        code('What is printed?', 'for i in range(3):\n    for j in range(2):\n        print("*", end="")\nprint()', ['******'],
          'The inner loop runs 2 times for each of the 3 outer iterations: 3 × 2 = 6 stars on one line.', { topic: 'Nested loops', d: 3 }),
        tf('A break statement exits only the innermost loop that contains it.', true, 'Outer loops keep running; break affects only the loop it is directly inside.', { topic: 'Loops', d: 2 }),
      ],
    },
    {
      key: 'prog-functions', title: 'Functions & Arrays', type: 'quiz', difficulty: 2, xp: 80,
      description: 'Write reusable code with functions and work with lists (arrays).',
      questions: [
        code('What is printed?', 'def square(n):\n    return n * n\n\nprint(square(4) + square(2))', ['20'], 'square(4) = 16 and square(2) = 4 → 20.', { topic: 'Functions' }),
        code('What is printed?', 'nums = [4, 8, 15, 16, 23, 42]\nprint(nums[2], nums[-1])', ['15 42'],
          'Index 2 is the third element (15). Negative index -1 is the last element (42).', { topic: 'Arrays', d: 2 }),
        code('What is printed?', 'nums = [3, 1, 2]\nnums.append(5)\nprint(len(nums))', ['4'], 'append adds one element, so the list now has 4 items.', { topic: 'Arrays' }),
        mcq('In Python, what does a function return if it has no return statement?', ['*None', '0', 'An empty string', 'It causes an error'],
          'Every Python function returns None by default.', { topic: 'Functions', d: 2 }),
        code('What is printed?', 'def greet(name="Student"):\n    return "Hi " + name\n\nprint(greet())', ['Hi Student'],
          'When no argument is passed, the default parameter value "Student" is used.', { topic: 'Functions', d: 2 }),
        code('What is printed?', 'print([n * 2 for n in range(4)])', ['[0, 2, 4, 6]', '[0,2,4,6]'],
          'The list comprehension doubles 0, 1, 2, 3.', { topic: 'Arrays', d: 3 }),
        mcq('In Python, Java and C, what is the index of the first element of an array/list?', ['*0', '1', '-1', 'It depends on the size'],
          'These languages use zero-based indexing.', { topic: 'Arrays' }),
      ],
    },
    {
      key: 'prog-boss', title: 'OOP Boss Challenge', type: 'challenge', difficulty: 3, xp: 120, time: 300,
      description: 'Timed boss round on classes, objects, inheritance and polymorphism.',
      questions: [
        mcq('Which OOP principle hides an object\'s internal state and exposes behavior only through methods?', ['*Encapsulation', 'Inheritance', 'Polymorphism', 'Recursion'],
          'Encapsulation bundles data with methods and restricts direct access (e.g. private fields + getters).', { topic: 'OOP principles' }),
        mcq('`class Dog extends Animal` is an example of:', ['*Inheritance', 'Encapsulation', 'Abstraction', 'Overloading'],
          'Dog inherits fields and methods from Animal ("is-a" relationship).', { topic: 'OOP principles' }),
        mcq('One method name behaving differently depending on the object that calls it is called:', ['*Polymorphism', 'Encapsulation', 'Composition', 'Instantiation'],
          'Polymorphism ("many forms") lets subclasses override methods with their own behavior.', { topic: 'OOP principles', d: 2 }),
        code('What does this Java code print?',
          'class Counter {\n    private int count = 0;\n    void add() { count++; }\n    int get() { return count; }\n}\n\nCounter c = new Counter();\nc.add(); c.add(); c.add();\nSystem.out.println(c.get());',
          ['3'], 'Each call to add() increments the private field. After three calls, get() returns 3.', { topic: 'Classes', d: 2 }),
        tf('A constructor runs automatically when an object is created.', true, 'Constructors initialize a new object\'s state at creation time.', { topic: 'Classes' }),
        code('What is printed?',
          'class Animal:\n    def speak(self):\n        return "..."\n\nclass Cat(Animal):\n    def speak(self):\n        return "Meow"\n\npets = [Animal(), Cat()]\nprint(pets[1].speak())',
          ['Meow'], 'pets[1] is a Cat, and Cat overrides speak() — polymorphism in action.', { topic: 'Polymorphism', d: 3 }),
        mcq('What does abstraction mainly mean in OOP?', ['*Showing only essential features while hiding implementation details', 'Copying code from a parent class', 'Creating many objects from one class', 'Storing data in arrays'],
          'Abstraction exposes what an object does, not how it does it (e.g. abstract classes and interfaces).', { topic: 'OOP principles', d: 2 }),
        multi('Which of these are Java access modifiers? Select all that apply.', ['*public', '*private', '*protected', 'static'],
          'public, protected, private (and package-private default) control visibility. static is not an access modifier.', { topic: 'Java', d: 3 }),
      ],
    },
  ],
  pretest: [
    mcq('Which data type stores only true or false values?', ['*Boolean', 'Integer', 'String', 'Float'], 'Booleans have exactly two values.'),
    code('What is printed?', 'print(2 + 3 * 4)', ['14'], 'Multiplication has higher precedence: 3 * 4 = 12, then + 2 = 14.'),
    code('What is printed?', 'x = 5\nx += 2\nprint(x)', ['7'], 'x += 2 is shorthand for x = x + 2.'),
    mcq('How many times does `for i in range(5):` loop?', ['*5', '4', '6', '0'], 'range(5) yields 0, 1, 2, 3, 4.'),
    mcq('A missing colon or misspelled keyword that stops a program from running is a:', ['*Syntax error', 'Logic error', 'Runtime error', 'Warning'], 'Syntax errors are caught before the program runs.'),
    code('What is printed?', 'a = [1, 2, 3]\nprint(a[1])', ['2'], 'Indexing starts at 0, so a[1] is the second element.'),
    tf('A function can return a value to the code that called it.', true, 'The return statement sends a value back to the caller.'),
    mcq('What is a class?', ['*A blueprint for creating objects', 'A single variable', 'A type of loop', 'A database table'], 'Objects are instances created from a class.'),
    code('What is printed?', 'print(len("DOrSU"))', ['5'], 'len counts the characters: D-O-r-S-U.'),
    mcq('Which keyword defines a function in Python?', ['*def', 'function', 'func', 'define'], 'Python uses def name(params):'),
  ],
}

// ---------------------------------------------------------------------
// DATABASE MANAGEMENT
// ---------------------------------------------------------------------
const database = {
  slug: 'database',
  name: 'Database Management',
  short_name: 'DBMS',
  description: 'ER modeling, keys, SQL queries, normalization and transactions.',
  icon: 'database',
  color: '#10B981',
  quests: [
    {
      key: 'db-concepts', title: 'Database Concepts & ER Modeling', type: 'quiz', difficulty: 1, xp: 60,
      description: 'Keys, relationships and the vocabulary of relational databases.',
      questions: [
        mcq('A column (or set of columns) that uniquely identifies each row in a table is the:', ['*Primary key', 'Foreign key', 'Index', 'Attribute'],
          'A primary key must be unique and not null for every row.', { topic: 'Keys' }),
        mcq('A column that references the primary key of another table is a:', ['*Foreign key', 'Candidate key', 'Super key', 'Composite key'],
          'Foreign keys enforce referential integrity between related tables.', { topic: 'Keys' }),
        mcq('"A student enrolls in many subjects, and a subject has many students" describes which relationship?', ['*Many-to-many', 'One-to-one', 'One-to-many', 'Recursive'],
          'Both sides can have many related rows, so it is many-to-many (M:N).', { topic: 'ER modeling' }),
        mcq('What does DBMS stand for?', ['*Database Management System', 'Data Backup Management Software', 'Digital Base Memory System', 'Database Modeling Standard'],
          'A DBMS (e.g. MySQL, PostgreSQL) stores, retrieves and manages data.', { topic: 'Concepts' }),
        tf('A primary key column may contain NULL values.', false, 'Primary keys are implicitly NOT NULL and UNIQUE.', { topic: 'Keys' }),
        multi('Which of the following are relational DBMS products? Select all that apply.', ['*MySQL', '*PostgreSQL', '*Oracle Database', 'MongoDB'],
          'MongoDB is a document (NoSQL) database; the others are relational.', { topic: 'Concepts', d: 2 }),
        mcq('How is a many-to-many relationship implemented in a relational schema?', ['*With a junction (associative) table holding two foreign keys', 'With a single foreign key in one table', 'By duplicating rows in both tables', 'It cannot be implemented'],
          'For example, an enrollments table with student_id and subject_code links students and subjects.', { topic: 'ER modeling', d: 2 }),
      ],
    },
    {
      key: 'db-sql', title: 'SQL Query Lab', type: 'simulation', difficulty: 2, xp: 90,
      description: 'Work with a students table — write, complete and order SQL like you would in the lab.',
      questions: [
        mcq('Using the table below, which query returns all third-year students?', ['*SELECT * FROM students WHERE year_level = 3;', 'SELECT students WHERE year_level = 3;', 'GET * FROM students IF year_level = 3;', 'SELECT * WHERE students.year_level = 3;'],
          'SELECT … FROM … WHERE … is the basic filtering pattern.', { topic: 'SELECT', code: 'students(id, name, course, year_level, gpa)' }),
        order('Arrange these SQL clauses in the order they must be written.', ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'],
          'Written order: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY.', { topic: 'Query structure', d: 2 }),
        mcq('Which aggregate function counts the number of rows?', ['*COUNT(*)', 'SUM(*)', 'TOTAL()', 'NUM()'], 'COUNT(*) counts rows; SUM adds numeric values.', { topic: 'Aggregates' }),
        short('Fill in the blank: SELECT name FROM students ____ BY gpa DESC;', ['ORDER'], 'ORDER BY sorts results; DESC means highest first.', { topic: 'Sorting', code: 'SELECT name FROM students ____ BY gpa DESC;' }),
        mcq('Which keyword removes duplicate rows from a result set?', ['*DISTINCT', 'UNIQUE', 'DIFFERENT', 'SINGLE'], 'SELECT DISTINCT course FROM students; lists each course once.', { topic: 'SELECT' }),
        mcq('Which JOIN returns only rows that have matching values in both tables?', ['*INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'],
          'INNER JOIN keeps only matched pairs; outer joins also keep unmatched rows.', { topic: 'Joins', d: 2 }),
        code('The scores table contains the values 80, 90 and 70. What does this query return?', 'SELECT AVG(score) FROM scores;', ['80', '80.0', '80.00'],
          '(80 + 90 + 70) / 3 = 80.', { topic: 'Aggregates', d: 2 }),
        mcq('Which statement modifies data in existing rows?', ['*UPDATE', 'ALTER', 'INSERT', 'MODIFY'], 'UPDATE changes rows; ALTER changes the table structure.', { topic: 'DML', d: 2 }),
      ],
    },
    {
      key: 'db-normalization', title: 'Normalization Lab', type: 'simulation', difficulty: 3, xp: 100,
      description: 'Spot anomalies and decompose tables through 1NF, 2NF and 3NF.',
      questions: [
        mcq('A column phone_numbers stores "0917-111-2222, 0998-333-4444" in a single cell. Which normal form is violated?', ['*1NF', '2NF', '3NF', 'BCNF'],
          '1NF requires atomic (single) values in each cell and no repeating groups.', { topic: '1NF', d: 2 }),
        mcq('Second Normal Form (2NF) removes:', ['*Partial dependencies on part of a composite key', 'Transitive dependencies', 'Multivalued attributes', 'All foreign keys'],
          'In 2NF every non-key attribute must depend on the whole primary key.', { topic: '2NF', d: 2 }),
        mcq('Third Normal Form (3NF) removes:', ['*Transitive dependencies between non-key attributes', 'Partial dependencies', 'Repeating groups', 'Primary keys'],
          'In 3NF non-key attributes depend only on the key — "the key, the whole key, and nothing but the key".', { topic: '3NF', d: 2 }),
        mcq('Enrollment(student_id, subject_code, student_name, grade) has key (student_id, subject_code). student_name depends only on student_id. This is a:', ['*Partial dependency (violates 2NF)', 'Transitive dependency (violates 3NF)', 'Repeating group (violates 1NF)', 'Fully normalized design'],
          'student_name depends on only part of the composite key, so move it to a Student table.', { topic: '2NF', d: 3 }),
        order('Arrange the normal forms in the order a table progresses through normalization.', ['UNF', '1NF', '2NF', '3NF', 'BCNF'],
          'Each normal form builds on the previous one.', { topic: 'Normalization' }),
        tf('Normalization helps reduce insertion, update and deletion anomalies.', true,
          'By removing redundancy, each fact is stored once, so it cannot become inconsistent.', { topic: 'Anomalies' }),
        mcq('Employee(emp_id, dept_id, dept_name): dept_name depends on dept_id, which depends on emp_id. How do you reach 3NF?', ['*Move dept_id and dept_name into a separate Department table', 'Add dept_name to the primary key', 'Delete the dept_id column', 'Store dept_name in every row twice'],
          'Removing the transitive dependency means Department(dept_id, dept_name) and Employee(emp_id, dept_id).', { topic: '3NF', d: 3 }),
      ],
    },
    {
      key: 'db-boss', title: 'Transactions & Integrity Boss Challenge', type: 'challenge', difficulty: 3, xp: 120, time: 300,
      description: 'Timed boss round on ACID, constraints, DDL/DML and database security.',
      questions: [
        mcq('In ACID, what does the "A" stand for?', ['*Atomicity', 'Availability', 'Accuracy', 'Authorization'], 'Atomicity: all operations in a transaction succeed, or none do.', { topic: 'ACID' }),
        mcq('Which command permanently saves the changes made in a transaction?', ['*COMMIT', 'SAVE', 'ROLLBACK', 'END'], 'COMMIT makes the transaction\'s changes durable.', { topic: 'Transactions' }),
        mcq('Which command undoes changes that have not yet been committed?', ['*ROLLBACK', 'UNDO', 'REVERT', 'DELETE'], 'ROLLBACK restores the database to its state before the transaction.', { topic: 'Transactions' }),
        multi('Which are DDL (Data Definition Language) commands? Select all that apply.', ['*CREATE', '*ALTER', '*DROP', 'SELECT', 'INSERT'],
          'DDL defines structure. SELECT and INSERT are DML (data manipulation).', { topic: 'SQL categories', d: 2 }),
        mcq('Which constraint ensures all values in a column are different?', ['*UNIQUE', 'CHECK', 'DEFAULT', 'NOT NULL'], 'UNIQUE rejects duplicate values in the column.', { topic: 'Constraints' }),
        tf('An index can speed up SELECT queries but may slow down INSERT operations.', true,
          'Every insert must also update the index, so indexes trade write speed for read speed.', { topic: 'Indexes', d: 2 }),
        mcq('The "I" in ACID (Isolation) ensures that:', ['*Concurrent transactions do not interfere with each other', 'Data is encrypted', 'Tables are independent', 'Users are authenticated'],
          'Isolation makes concurrent transactions behave as if they ran one at a time.', { topic: 'ACID', d: 2 }),
        mcq('What is the best defense against SQL injection?', ['*Parameterized queries (prepared statements)', 'Hiding the database server', 'Using longer table names', 'Removing all indexes'],
          'Parameters are sent separately from the SQL text, so user input is never executed as code.', { topic: 'Security', d: 3 }),
      ],
    },
  ],
  pretest: [
    mcq('What is the purpose of a primary key?', ['*To uniquely identify each row', 'To speed up all queries', 'To link to another database', 'To encrypt data'], 'Primary keys uniquely identify rows.'),
    mcq('Which SQL command retrieves data from a table?', ['*SELECT', 'GET', 'FETCH', 'RETRIEVE'], 'SELECT is the query command.'),
    mcq('First Normal Form (1NF) requires:', ['*Atomic values in every column', 'No foreign keys', 'Only numeric data', 'At most three columns'], 'Each cell holds a single value.'),
    tf('A foreign key can reference the primary key of another table.', true, 'That is exactly what foreign keys are for.'),
    mcq('Which clause filters groups after aggregation?', ['*HAVING', 'WHERE', 'ORDER BY', 'LIMIT'], 'WHERE filters rows before grouping; HAVING filters groups.'),
    mcq('"One department has many employees" is which relationship?', ['*One-to-many', 'One-to-one', 'Many-to-many', 'None'], 'One department row relates to many employee rows.'),
    mcq('Which command adds a new row to a table?', ['*INSERT', 'ADD', 'UPDATE', 'CREATE'], 'INSERT INTO table (cols) VALUES (...);'),
    mcq('In ACID, what does the "C" stand for?', ['*Consistency', 'Concurrency', 'Commit', 'Control'], 'Consistency keeps the database valid according to its rules.'),
    short('Which two-word SQL clause sorts query results?', ['ORDER BY'], 'ORDER BY column ASC|DESC.'),
    mcq('Which JOIN returns all rows from the left table, even without a match?', ['*LEFT JOIN', 'INNER JOIN', 'CROSS JOIN', 'SELF JOIN'], 'Unmatched right-side columns become NULL.'),
  ],
}

// ---------------------------------------------------------------------
// WEB DEVELOPMENT
// ---------------------------------------------------------------------
const web = {
  slug: 'web-development',
  name: 'Web Development',
  short_name: 'WEB',
  description: 'HTML structure, CSS layout, JavaScript & the DOM, and how the web works (HTTP).',
  icon: 'globe',
  color: '#F97316',
  quests: [
    {
      key: 'web-html', title: 'HTML Foundations', type: 'quiz', difficulty: 1, xp: 60,
      description: 'Markup, semantic elements, forms and document structure.',
      questions: [
        mcq('What does HTML stand for?', ['*HyperText Markup Language', 'HighText Machine Language', 'HyperTool Markup Language', 'Home Tool Markup Language'], 'HTML describes the structure of web pages.', { topic: 'Basics' }),
        mcq('Which tag creates the largest (most important) heading?', ['*<h1>', '<h6>', '<head>', '<header>'], '<h1> to <h6> go from most to least important.', { topic: 'Elements' }),
        mcq('Which attribute specifies the destination of a link?', ['*href', 'src', 'link', 'target'], '<a href="https://dorsu.edu.ph">DOrSU</a>', { topic: 'Links' }),
        tf('The alt attribute on <img> helps screen-reader users understand an image.', true, 'alt text is read aloud by screen readers and shown if the image fails to load.', { topic: 'Accessibility' }),
        multi('Which of these are semantic HTML5 elements? Select all that apply.', ['*<header>', '*<nav>', '*<article>', '<div>', '<span>'],
          'Semantic elements describe their meaning. <div> and <span> are generic containers.', { topic: 'Semantics', d: 2 }),
        mcq('Which element creates a drop-down list in a form?', ['*<select>', '<dropdown>', '<list>', '<input type="dropdown">'], '<select> contains <option> elements.', { topic: 'Forms', d: 2 }),
        order('Arrange these parts of an HTML document in the order they appear.', ['<!DOCTYPE html>', '<html>', '<head>', '<body>'],
          'The doctype comes first, then <html>, which contains <head> (metadata) followed by <body> (content).', { topic: 'Structure' }),
      ],
    },
    {
      key: 'web-css', title: 'CSS Styling & Layout', type: 'simulation', difficulty: 2, xp: 80,
      description: 'Selectors, the box model, specificity, Flexbox and responsive design.',
      questions: [
        mcq('Which CSS property changes the text color?', ['*color', 'font-color', 'text-color', 'foreground'], 'color sets the text color; background-color sets the background.', { topic: 'Properties' }),
        mcq('Which selector targets every element with class="card"?', ['*.card', '#card', 'card', '*card'], '. selects classes, # selects ids.', { topic: 'Selectors' }),
        order('Arrange the CSS box model layers from the inside out.', ['Content', 'Padding', 'Border', 'Margin'],
          'Padding surrounds content, the border wraps the padding, and margin is the space outside the border.', { topic: 'Box model', d: 2 }),
        mcq('Which selector has the highest specificity?', ['*#main', '.main', 'div', '*'], 'IDs beat classes, classes beat element selectors, and * has zero specificity.', { topic: 'Specificity', d: 2 }),
        mcq('What does `display: flex; justify-content: center;` do?', ['*Centers flex items along the main axis', 'Centers text vertically only', 'Makes items wrap to a new line', 'Hides overflowing items'],
          'justify-content aligns items on the main axis (horizontal by default); align-items handles the cross axis.', { topic: 'Flexbox', d: 2 }),
        code('With the default box-sizing (content-box), what is the total rendered width of .box in pixels?', '.box {\n  width: 100px;\n  padding: 10px;\n  border: 5px solid black;\n}', ['130', '130px'],
          'content-box: 100 + 10 + 10 (padding) + 5 + 5 (border) = 130px. With border-box it would be 100px.', { topic: 'Box model', d: 3 }),
        mcq('Which technique applies styles depending on the screen width?', ['*Media queries', 'Pseudo-elements', 'CSS variables', 'Keyframes'],
          '@media (min-width: 768px) { … } is the foundation of responsive design.', { topic: 'Responsive design' }),
      ],
    },
    {
      key: 'web-js', title: 'JavaScript & the DOM', type: 'quiz', difficulty: 2, xp: 80,
      description: 'Types, coercion, array methods and DOM manipulation.',
      questions: [
        code('What is logged?', 'console.log(typeof 42);', ['number'], 'JavaScript has a single number type for integers and decimals.', { topic: 'Types' }),
        code('What is logged?', 'let a = "5";\nlet b = 2;\nconsole.log(a + b);', ['52'], 'With a string operand, + concatenates: "5" + 2 → "52".', { topic: 'Type coercion', d: 2 }),
        mcq('Which method selects an element by its id?', ['*document.getElementById()', 'document.getElement()', 'document.querySelectorAll()', 'window.findId()'],
          'document.getElementById("nav") returns the element with id="nav".', { topic: 'DOM' }),
        mcq('Which keyword declares a block-scoped variable that cannot be reassigned?', ['*const', 'var', 'let', 'static'], 'const prevents reassignment; let allows it; var is function-scoped.', { topic: 'Variables' }),
        code('What is logged?', 'const arr = [1, 2, 3];\nconsole.log(arr.map(x => x * 10).join("-"));', ['10-20-30'],
          'map transforms each element; join combines them into a string with "-".', { topic: 'Arrays', d: 3 }),
        mcq('Which event fires when a user clicks a button?', ['*click', 'press', 'submit', 'tap'], 'button.addEventListener("click", handler)', { topic: 'Events' }),
        tf('In JavaScript, === compares both value and type.', true, '1 === "1" is false, while 1 == "1" is true because == coerces types.', { topic: 'Operators', d: 2 }),
      ],
    },
    {
      key: 'web-boss', title: 'Full-Stack Web Boss Challenge', type: 'challenge', difficulty: 3, xp: 120, time: 300,
      description: 'Timed boss round on HTTP, client vs server, JSON and responsive design.',
      questions: [
        mcq('Which HTTP method is typically used to submit a form that creates a new resource?', ['*POST', 'GET', 'DELETE', 'HEAD'], 'POST sends data in the request body to create something.', { topic: 'HTTP' }),
        mcq('What does HTTP status code 404 mean?', ['*Not Found', 'Server Error', 'Unauthorized', 'OK'], '4xx codes are client errors; 404 means the resource does not exist.', { topic: 'HTTP' }),
        mcq('Which of these runs on the server rather than in the browser?', ['*PHP', 'CSS', 'HTML', 'The DOM'], 'PHP is executed on the server, which sends the resulting HTML to the browser.', { topic: 'Client vs server' }),
        multi('Which of these are valid HTTP methods? Select all that apply.', ['*GET', '*PUT', '*DELETE', 'FETCH'],
          'fetch() is a JavaScript API, not an HTTP method.', { topic: 'HTTP', d: 2 }),
        mcq('What does JSON stand for?', ['*JavaScript Object Notation', 'Java Standard Object Network', 'JavaScript Online Node', 'Joined Syntax Object Notation'],
          'JSON is the most common data format for web APIs.', { topic: 'APIs' }),
        mcq('HTTP status codes in the 5xx range indicate:', ['*Server errors', 'Successful requests', 'Redirects', 'Client errors'], '500 Internal Server Error, 503 Service Unavailable, etc.', { topic: 'HTTP', d: 2 }),
        tf('Cookies are stored on the client (in the browser).', true, 'The server sets cookies via headers; the browser stores and sends them back.', { topic: 'State', d: 2 }),
        mcq('What is the purpose of <meta name="viewport" content="width=device-width, initial-scale=1">?', ['*It makes the page scale correctly on mobile devices', 'It improves SEO ranking', 'It loads CSS faster', 'It enables JavaScript'],
          'Without it, mobile browsers render the page at desktop width and zoom out.', { topic: 'Responsive design', d: 3 }),
      ],
    },
  ],
  pretest: [
    mcq('Which tag defines a paragraph?', ['*<p>', '<para>', '<text>', '<pg>'], '<p> wraps a paragraph of text.'),
    mcq('What does CSS stand for?', ['*Cascading Style Sheets', 'Creative Style System', 'Computer Styled Sections', 'Colorful Style Sheets'], 'CSS controls presentation.'),
    mcq('Which property changes the background color?', ['*background-color', 'bgcolor', 'color', 'background-style'], 'background-color: #4F46E5;'),
    code('What is logged?', 'console.log(3 + "3");', ['33'], 'A number plus a string concatenates.'),
    tf('HTML is a programming language.', false, 'HTML is a markup language — it has no logic or control flow.'),
    mcq('Which tag creates a hyperlink?', ['*<a>', '<link>', '<href>', '<url>'], '<link> is for stylesheets; <a> is for clickable links.'),
    mcq('HTTP status 200 means:', ['*OK (success)', 'Not Found', 'Redirect', 'Forbidden'], '2xx codes indicate success.'),
    mcq('Which language adds interactivity to web pages in the browser?', ['*JavaScript', 'HTML', 'CSS', 'SQL'], 'JavaScript runs in the browser and manipulates the DOM.'),
    mcq('Which selector targets the element with id="nav"?', ['*#nav', '.nav', 'nav', '@nav'], '# targets ids.'),
    mcq('Which element creates an unordered (bulleted) list?', ['*<ul>', '<ol>', '<li>', '<list>'], '<ul> contains <li> items.'),
  ],
}

export const subjects = [networking, programming, database, web]

// ---------------------------------------------------------------------
// BADGES — rule_type: quests_completed | perfect_scores | challenges | labs
//                     | xp | level | streak | subject_complete
// ---------------------------------------------------------------------
export const badges = [
  { code: 'first-steps', name: 'First Steps', description: 'Pass your first quest.', icon: 'footprints', tier: 'bronze', rule_type: 'quests_completed', rule_value: 1 },
  { code: 'quest-explorer', name: 'Quest Explorer', description: 'Pass 5 different quests.', icon: 'compass', tier: 'silver', rule_type: 'quests_completed', rule_value: 5 },
  { code: 'quest-master', name: 'Quest Master', description: 'Pass 12 different quests.', icon: 'crown', tier: 'gold', rule_type: 'quests_completed', rule_value: 12 },
  { code: 'perfectionist', name: 'Perfectionist', description: 'Score 100% on a quest or challenge.', icon: 'target', tier: 'bronze', rule_type: 'perfect_scores', rule_value: 1 },
  { code: 'flawless-five', name: 'Flawless Five', description: 'Get 5 perfect scores.', icon: 'gem', tier: 'gold', rule_type: 'perfect_scores', rule_value: 5 },
  { code: 'challenger', name: 'Challenger', description: 'Complete your first Daily Challenge.', icon: 'swords', tier: 'bronze', rule_type: 'challenges', rule_value: 1 },
  { code: 'challenge-veteran', name: 'Challenge Veteran', description: 'Complete 10 Daily Challenges.', icon: 'shield', tier: 'silver', rule_type: 'challenges', rule_value: 10 },
  { code: 'on-fire', name: 'On Fire', description: 'Keep a 3-day learning streak.', icon: 'flame', tier: 'bronze', rule_type: 'streak', rule_value: 3 },
  { code: 'unstoppable', name: 'Unstoppable', description: 'Keep a 7-day learning streak.', icon: 'zap', tier: 'gold', rule_type: 'streak', rule_value: 7 },
  { code: 'subnet-ninja', name: 'Subnet Ninja', description: 'Solve 10 problems in the Subnetting Lab.', icon: 'binary', tier: 'silver', rule_type: 'labs', rule_value: 10 },
  { code: 'rising-star', name: 'Rising Star', description: 'Earn 500 XP.', icon: 'star', tier: 'bronze', rule_type: 'xp', rule_value: 500 },
  { code: 'it-legend', name: 'IT Legend', description: 'Earn 2,000 XP.', icon: 'trophy', tier: 'gold', rule_type: 'xp', rule_value: 2000 },
  { code: 'level-5', name: 'Level 5 Hero', description: 'Reach level 5.', icon: 'medal', tier: 'silver', rule_type: 'level', rule_value: 5 },
  { code: 'network-ninja', name: 'Network Ninja', description: 'Pass every Networking quest.', icon: 'network', tier: 'gold', rule_type: 'subject_complete', subject: 'networking' },
  { code: 'code-crafter', name: 'Code Crafter', description: 'Pass every Programming quest.', icon: 'code', tier: 'gold', rule_type: 'subject_complete', subject: 'programming' },
  { code: 'data-architect', name: 'Data Architect', description: 'Pass every Database Management quest.', icon: 'database', tier: 'gold', rule_type: 'subject_complete', subject: 'database' },
  { code: 'web-weaver', name: 'Web Weaver', description: 'Pass every Web Development quest.', icon: 'globe', tier: 'gold', rule_type: 'subject_complete', subject: 'web-development' },
]
