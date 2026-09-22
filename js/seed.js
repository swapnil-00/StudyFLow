// StudyFlow Demo Data Seeder
// Creates realistic demo data for 3 branches

function seedDatabase() {
  const { uid, now, addDays, getAvatarColor } = utils;

  const db = {
    branches: [],
    floors: [],
    rooms: [],
    seats: [],
    students: [],
    membershipPlans: [],
    memberships: [],
    seatAssignments: [],
    reservations: [],
    payments: [],
    receipts: [],
    attendance: [],
    expenses: [],
    notifications: [],
    activityLog: [],
    waitlist: [],
    staff: [],
    seatTransfers: [],
    settings: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      orgName: 'StudyFlow Library',
      address: 'Mumbai, Maharashtra',
      phone: '+91 98765 43210',
      email: 'admin@studyflow.in',
      theme: 'light',
      logo: null
    }
  };

  // ── Branches ───────────────────────────────────────────────────
  const branches = [
    { id: 'BR-001', name: 'Andheri West', city: 'Mumbai', address: 'Shop 12, Andheri West, Mumbai - 400058', phone: '+91 98765 43210', email: 'andheri@studyflow.in', status: 'active', openTime: '06:00', closeTime: '23:00' },
    { id: 'BR-002', name: 'Dadar Central', city: 'Mumbai', address: 'FF-4, Dadar Central, Mumbai - 400014', phone: '+91 98765 43211', email: 'dadar@studyflow.in', status: 'active', openTime: '06:00', closeTime: '23:00' },
    { id: 'BR-003', name: 'Pune Camp', city: 'Pune', address: 'MG Road, Pune Camp, Pune - 411001', phone: '+91 98765 43212', email: 'pune@studyflow.in', status: 'active', openTime: '05:30', closeTime: '23:30' },
  ];
  db.branches = branches;

  // ── Membership Plans ───────────────────────────────────────────
  const plans = [
    { id: 'PLAN-001', name: 'Monthly', duration: 30, durationUnit: 'days', price: 2500, description: 'Standard monthly access, 8am–10pm', active: true, accessHours: '08:00–22:00' },
    { id: 'PLAN-002', name: 'Quarterly', duration: 90, durationUnit: 'days', price: 6500, description: 'Quarterly access with 15% savings', active: true, accessHours: '06:00–23:00' },
    { id: 'PLAN-003', name: '6 Months', duration: 180, durationUnit: 'days', price: 12000, description: 'Half-yearly access with 20% savings', active: true, accessHours: '06:00–23:00' },
    { id: 'PLAN-004', name: 'Yearly', duration: 365, durationUnit: 'days', price: 20000, description: 'Annual access with 35% savings', active: true, accessHours: '05:00–23:59' },
    { id: 'PLAN-005', name: 'Weekly', duration: 7, durationUnit: 'days', price: 800, description: 'Short term weekly pass', active: true, accessHours: '08:00–22:00' },
  ];
  db.membershipPlans = plans;

  // ── Staff ──────────────────────────────────────────────────────
  db.staff = [
    { id: 'STF-001', name: 'Arjun Mehta', role: 'Owner', email: 'arjun@studyflow.in', phone: '+91 98000 00001', branchId: null, status: 'active', createdAt: now() },
    { id: 'STF-002', name: 'Kavita Sharma', role: 'Manager', email: 'kavita@studyflow.in', phone: '+91 98000 00002', branchId: 'BR-001', status: 'active', createdAt: now() },
    { id: 'STF-003', name: 'Suresh Patel', role: 'Receptionist', email: 'suresh@studyflow.in', phone: '+91 98000 00003', branchId: 'BR-001', status: 'active', createdAt: now() },
    { id: 'STF-004', name: 'Meena Joshi', role: 'Receptionist', email: 'meena@studyflow.in', phone: '+91 98000 00004', branchId: 'BR-002', status: 'active', createdAt: now() },
    { id: 'STF-005', name: 'Rakesh Singh', role: 'Manager', email: 'rakesh@studyflow.in', phone: '+91 98000 00005', branchId: 'BR-003', status: 'active', createdAt: now() },
  ];

  // ── Floors & Rooms ─────────────────────────────────────────────
  const floorDefs = [
    // BR-001
    { id: 'FLR-001', branchId: 'BR-001', name: 'Ground Floor', level: 0 },
    { id: 'FLR-002', branchId: 'BR-001', name: 'First Floor', level: 1 },
    // BR-002
    { id: 'FLR-003', branchId: 'BR-002', name: 'Ground Floor', level: 0 },
    { id: 'FLR-004', branchId: 'BR-002', name: 'First Floor', level: 1 },
    // BR-003
    { id: 'FLR-005', branchId: 'BR-003', name: 'Ground Floor', level: 0 },
    { id: 'FLR-006', branchId: 'BR-003', name: 'First Floor', level: 1 },
  ];
  db.floors = floorDefs;

  const roomDefs = [
    // BR-001 Ground Floor
    { id: 'RM-001', floorId: 'FLR-001', name: 'General Study Hall', capacity: 30, type: 'general', acAvailable: false, rows: 5, cols: 6 },
    { id: 'RM-002', floorId: 'FLR-001', name: 'Quiet Zone', capacity: 20, type: 'silent', acAvailable: true, rows: 4, cols: 5 },
    // BR-001 First Floor
    { id: 'RM-003', floorId: 'FLR-002', name: 'AC Premium Room', capacity: 24, type: 'premium', acAvailable: true, rows: 4, cols: 6 },
    { id: 'RM-004', floorId: 'FLR-002', name: 'Discussion Room', capacity: 12, type: 'discussion', acAvailable: true, rows: 2, cols: 6 },
    // BR-002 Ground Floor
    { id: 'RM-005', floorId: 'FLR-003', name: 'Main Hall', capacity: 36, type: 'general', acAvailable: false, rows: 6, cols: 6 },
    { id: 'RM-006', floorId: 'FLR-003', name: 'Silent Study', capacity: 20, type: 'silent', acAvailable: true, rows: 4, cols: 5 },
    // BR-002 First Floor
    { id: 'RM-007', floorId: 'FLR-004', name: 'VIP Cabin Room', capacity: 10, type: 'premium', acAvailable: true, rows: 2, cols: 5 },
    // BR-003
    { id: 'RM-008', floorId: 'FLR-005', name: 'Reading Hall A', capacity: 30, type: 'general', acAvailable: false, rows: 5, cols: 6 },
    { id: 'RM-009', floorId: 'FLR-005', name: 'Reading Hall B', capacity: 24, type: 'silent', acAvailable: true, rows: 4, cols: 6 },
    { id: 'RM-010', floorId: 'FLR-006', name: 'AC Study Room', capacity: 20, type: 'premium', acAvailable: true, rows: 4, cols: 5 },
  ];
  db.rooms = roomDefs;

  // ── Seats ──────────────────────────────────────────────────────
  const rowLetters = 'ABCDEFGHIJ'.split('');
  const seatTypes = ['standard', 'standard', 'standard', 'window', 'corner', 'premium'];

  roomDefs.forEach(room => {
    for (let r = 0; r < room.rows; r++) {
      for (let c = 1; c <= room.cols; c++) {
        const rowLetter = rowLetters[r];
        const seatNum = String(c).padStart(2, '0');
        const label = `${rowLetter}${seatNum}`;
        const seatType = (c === 1 || c === room.cols) ? 'window' : seatTypes[Math.floor(Math.random() * 3)];
        db.seats.push({
          id: `SEAT-${room.id}-${label}`,
          roomId: room.id,
          label,
          row: rowLetter,
          col: c,
          type: seatType,
          status: 'available',
          createdAt: new Date(Date.now() - 90 * 86400000).toISOString()
        });
      }
    }
  });

  // ── Students ───────────────────────────────────────────────────
  const studentData = [
    // Branch 1 students (50)
    { name: 'Rahul Sharma', phone: '9876543001', email: 'rahul.sharma@email.com', gender: 'Male', dob: '2001-05-15', course: 'UPSC Civil Services', college: 'Delhi University', address: 'Andheri East, Mumbai', branchId: 'BR-001' },
    { name: 'Priya Patel', phone: '9876543002', email: 'priya.patel@email.com', gender: 'Female', dob: '2002-08-22', course: 'CA Foundation', college: 'Mithibai College', address: 'Andheri West, Mumbai', branchId: 'BR-001' },
    { name: 'Aarav Mehta', phone: '9876543003', email: 'aarav.mehta@email.com', gender: 'Male', dob: '2000-12-10', course: 'GATE Preparation', college: 'IIT Bombay', address: 'Powai, Mumbai', branchId: 'BR-001' },
    { name: 'Ananya Shah', phone: '9876543004', email: 'ananya.shah@email.com', gender: 'Female', dob: '2003-03-18', course: 'SSC CGL', college: 'Jai Hind College', address: 'Dadar, Mumbai', branchId: 'BR-001' },
    { name: 'Rohan Verma', phone: '9876543005', email: 'rohan.verma@email.com', gender: 'Male', dob: '2001-07-04', course: 'MPSC', college: 'KC College', address: 'Bandra, Mumbai', branchId: 'BR-001' },
    { name: 'Sneha Joshi', phone: '9876543006', email: 'sneha.joshi@email.com', gender: 'Female', dob: '2002-11-29', course: 'Bank PO', college: 'Ruia College', address: 'Mulund, Mumbai', branchId: 'BR-001' },
    { name: 'Aditya Singh', phone: '9876543007', email: 'aditya.singh@email.com', gender: 'Male', dob: '2000-02-14', course: 'NEET PG', college: 'KEM Hospital', address: 'Parel, Mumbai', branchId: 'BR-001' },
    { name: 'Kavya Nair', phone: '9876543008', email: 'kavya.nair@email.com', gender: 'Female', dob: '2003-06-20', course: 'CA IPCC', college: 'Sathaye College', address: 'Vile Parle, Mumbai', branchId: 'BR-001' },
    { name: 'Vikram Desai', phone: '9876543009', email: 'vikram.desai@email.com', gender: 'Male', dob: '2001-09-11', course: 'Railway Exam', college: 'NM College', address: 'Juhu, Mumbai', branchId: 'BR-001' },
    { name: 'Pooja Kulkarni', phone: '9876543010', email: 'pooja.kulkarni@email.com', gender: 'Female', dob: '2002-01-08', course: 'UPSC Civil Services', college: 'Xaviers College', address: 'Fort, Mumbai', branchId: 'BR-001' },
    { name: 'Nikhil Patil', phone: '9876543011', email: 'nikhil.patil@email.com', gender: 'Male', dob: '2001-04-25', course: 'SSC MTS', college: 'Bhavans College', address: 'Andheri West, Mumbai', branchId: 'BR-001' },
    { name: 'Ritika Gupta', phone: '9876543012', email: 'ritika.gupta@email.com', gender: 'Female', dob: '2003-07-16', course: 'CA Final', college: 'Mithibai College', address: 'Malad, Mumbai', branchId: 'BR-001' },
    { name: 'Aryan Kumar', phone: '9876543013', email: 'aryan.kumar@email.com', gender: 'Male', dob: '2000-10-03', course: 'GATE CS', college: 'VJTI', address: 'Matunga, Mumbai', branchId: 'BR-001' },
    { name: 'Divya Menon', phone: '9876543014', email: 'divya.menon@email.com', gender: 'Female', dob: '2002-05-30', course: 'JIPMAT', college: 'IIM Indore', address: 'Chembur, Mumbai', branchId: 'BR-001' },
    { name: 'Harsh Agarwal', phone: '9876543015', email: 'harsh.agarwal@email.com', gender: 'Male', dob: '2001-08-19', course: 'Bank Clerk', college: 'Elphinstone College', address: 'Dadar, Mumbai', branchId: 'BR-001' },
    { name: 'Ishita Rao', phone: '9876543016', email: 'ishita.rao@email.com', gender: 'Female', dob: '2003-02-12', course: 'MPSC Group B', college: 'Sophia College', address: 'Bandra, Mumbai', branchId: 'BR-001' },
    { name: 'Karan Malhotra', phone: '9876543017', email: 'karan.malhotra@email.com', gender: 'Male', dob: '2000-06-28', course: 'CA Foundation', college: 'KC College', address: 'Borivali, Mumbai', branchId: 'BR-001' },
    { name: 'Lahari Reddy', phone: '9876543018', email: 'lahari.reddy@email.com', gender: 'Female', dob: '2002-09-04', course: 'IAS Prelims', college: 'Wilson College', address: 'Santacruz, Mumbai', branchId: 'BR-001' },
    { name: 'Manish Tiwari', phone: '9876543019', email: 'manish.tiwari@email.com', gender: 'Male', dob: '2001-11-21', course: 'SSC CHSL', college: 'Ramniranjan College', address: 'Ghatkopar, Mumbai', branchId: 'BR-001' },
    { name: 'Nidhi Choudhary', phone: '9876543020', email: 'nidhi.choudhary@email.com', gender: 'Female', dob: '2003-04-07', course: 'NEET UG', college: 'Bombay Hospital', address: 'Kurla, Mumbai', branchId: 'BR-001' },
    // Branch 2 students (20)
    { name: 'Ojas Bhatt', phone: '9876543021', email: 'ojas.bhatt@email.com', gender: 'Male', dob: '2001-03-14', course: 'CAT MBA', college: 'Welingkar', address: 'Dadar, Mumbai', branchId: 'BR-002' },
    { name: 'Pallavi Iyer', phone: '9876543022', email: 'pallavi.iyer@email.com', gender: 'Female', dob: '2002-06-09', course: 'Bank PO', college: 'Ruparel College', address: 'Mahim, Mumbai', branchId: 'BR-002' },
    { name: 'Qasim Khan', phone: '9876543023', email: 'qasim.khan@email.com', gender: 'Male', dob: '2000-01-17', course: 'UPSC', college: 'Grant Medical College', address: 'Worli, Mumbai', branchId: 'BR-002' },
    { name: 'Riya Pandey', phone: '9876543024', email: 'riya.pandey@email.com', gender: 'Female', dob: '2003-10-05', course: 'SSC CGL', college: 'Siddharth College', address: 'Prabhadevi, Mumbai', branchId: 'BR-002' },
    { name: 'Siddharth Wagh', phone: '9876543025', email: 'siddharth.wagh@email.com', gender: 'Male', dob: '2001-07-22', course: 'MPSC', college: 'Sydenham College', address: 'Sewri, Mumbai', branchId: 'BR-002' },
    { name: 'Tanvi Shirke', phone: '9876543026', email: 'tanvi.shirke@email.com', gender: 'Female', dob: '2002-12-18', course: 'CA IPCC', college: 'HR College', address: 'Lalbaug, Mumbai', branchId: 'BR-002' },
    { name: 'Uday Naik', phone: '9876543027', email: 'uday.naik@email.com', gender: 'Male', dob: '2000-04-30', course: 'Railway TC', college: 'Kirti College', address: 'Dadar TT, Mumbai', branchId: 'BR-002' },
    { name: 'Veda Kulkarni', phone: '9876543028', email: 'veda.kulkarni@email.com', gender: 'Female', dob: '2003-08-25', course: 'NEET UG', college: 'Nair Hospital', address: 'Wadala, Mumbai', branchId: 'BR-002' },
    { name: 'Waris Sheikh', phone: '9876543029', email: 'waris.sheikh@email.com', gender: 'Male', dob: '2001-02-11', course: 'Bank Clerk', college: 'Sathaye College', address: 'Shivaji Park, Mumbai', branchId: 'BR-002' },
    { name: 'Yamini Patil', phone: '9876543030', email: 'yamini.patil@email.com', gender: 'Female', dob: '2002-05-03', course: 'IFS', college: 'Elphinstone College', address: 'Parel, Mumbai', branchId: 'BR-002' },
    // Branch 3 students (20)
    { name: 'Zara Shaikh', phone: '9876543031', email: 'zara.shaikh@email.com', gender: 'Female', dob: '2001-09-16', course: 'UPSC', college: 'Fergusson College', address: 'Koregaon Park, Pune', branchId: 'BR-003' },
    { name: 'Amit Deshpande', phone: '9876543032', email: 'amit.deshpande@email.com', gender: 'Male', dob: '2000-11-27', course: 'MPSC Group A', college: 'BMCC Pune', address: 'Deccan, Pune', branchId: 'BR-003' },
    { name: 'Bhavana Gaikwad', phone: '9876543033', email: 'bhavana.gaikwad@email.com', gender: 'Female', dob: '2002-03-08', course: 'CA Final', college: 'SP College', address: 'Sadashiv Peth, Pune', branchId: 'BR-003' },
    { name: 'Chirag More', phone: '9876543034', email: 'chirag.more@email.com', gender: 'Male', dob: '2003-07-31', course: 'Bank PO', college: 'MIT Pune', address: 'Kothrud, Pune', branchId: 'BR-003' },
    { name: 'Disha Jadhav', phone: '9876543035', email: 'disha.jadhav@email.com', gender: 'Female', dob: '2001-01-22', course: 'SSC', college: 'Garware College', address: 'Karve Nagar, Pune', branchId: 'BR-003' },
    { name: 'Eshan Sawant', phone: '9876543036', email: 'eshan.sawant@email.com', gender: 'Male', dob: '2002-04-14', course: 'GATE', college: 'COEP Pune', address: 'Shivajinagar, Pune', branchId: 'BR-003' },
    { name: 'Farida Ansari', phone: '9876543037', email: 'farida.ansari@email.com', gender: 'Female', dob: '2000-06-06', course: 'JLPT', college: 'SIU Pune', address: 'Aundh, Pune', branchId: 'BR-003' },
    { name: 'Ganesh Thorat', phone: '9876543038', email: 'ganesh.thorat@email.com', gender: 'Male', dob: '2003-09-19', course: 'UPSC Mains', college: 'Abhinav College', address: 'Katraj, Pune', branchId: 'BR-003' },
    { name: 'Hina Shaikh', phone: '9876543039', email: 'hina.shaikh@email.com', gender: 'Female', dob: '2001-12-13', course: 'NEET', college: 'B J Medical', address: 'Camp, Pune', branchId: 'BR-003' },
    { name: 'Ishan Kulkarni', phone: '9876543040', email: 'ishan.kulkarni@email.com', gender: 'Male', dob: '2002-02-28', course: 'CA Foundation', college: 'Pune Vidyarthi Griha', address: 'Swargate, Pune', branchId: 'BR-003' },
  ];

  // Create students
  studentData.forEach((s, i) => {
    const student = {
      id: `STU-${String(10001 + i).padStart(5, '0')}`,
      ...s,
      status: 'active',
      avatar: getAvatarColor(s.name),
      emergencyContact: { name: s.name.split(' ')[0] + ' Sr.', phone: '9' + String(Math.floor(Math.random() * 900000000) + 100000000) },
      createdAt: new Date(Date.now() - Math.random() * 180 * 86400000).toISOString()
    };
    db.students.push(student);
  });

  // ── Assign Seats & Memberships ─────────────────────────────────
  const todayISO = new Date().toISOString().split('T')[0];

  const membershipConfigs = [
    // Most paid, some partial, some pending
    { planIdx: 0, payPct: 1.0, startOffset: -20 }, // paid monthly
    { planIdx: 0, payPct: 1.0, startOffset: -10 },
    { planIdx: 1, payPct: 1.0, startOffset: -45 }, // paid quarterly
    { planIdx: 1, payPct: 0.5, startOffset: -30 }, // partial quarterly
    { planIdx: 2, payPct: 1.0, startOffset: -60 }, // paid 6m
    { planIdx: 0, payPct: 0.0, startOffset: -5 },  // pending monthly
    { planIdx: 3, payPct: 1.0, startOffset: -120 }, // paid yearly
    { planIdx: 0, payPct: 1.0, startOffset: -27 }, // expiring soon (monthly started 27d ago)
    { planIdx: 1, payPct: 1.0, startOffset: -50 },
    { planIdx: 0, payPct: 1.0, startOffset: -15 },
  ];

  // Get all seats for branch 1
  const br1RoomIds = roomDefs.filter(r => ['FLR-001', 'FLR-002'].includes(r.floorId)).map(r => r.id);
  const br1Seats = db.seats.filter(s => br1RoomIds.includes(s.roomId));
  const br2RoomIds = roomDefs.filter(r => ['FLR-003', 'FLR-004'].includes(r.floorId)).map(r => r.id);
  const br2Seats = db.seats.filter(s => br2RoomIds.includes(s.roomId));
  const br3RoomIds = roomDefs.filter(r => ['FLR-005', 'FLR-006'].includes(r.floorId)).map(r => r.id);
  const br3Seats = db.seats.filter(s => br3RoomIds.includes(s.roomId));

  function assignStudentSeat(student, seat, planIdx, payPct, startOffset) {
    const plan = plans[planIdx];
    const startDate = new Date(Date.now() + startOffset * 86400000).toISOString().split('T')[0];
    const endDate = addDays(startDate, plan.duration);

    // Membership
    const mem = {
      id: uid('MEM'),
      studentId: student.id,
      planId: plan.id,
      planName: plan.name,
      startDate,
      endDate,
      price: plan.price,
      discount: 0,
      status: 'active',
      createdAt: new Date(startDate).toISOString()
    };
    db.memberships.push(mem);

    // Assignment
    const asn = {
      id: uid('ASN'),
      studentId: student.id,
      seatId: seat.id,
      membershipId: mem.id,
      startDate,
      endDate,
      status: 'active',
      createdAt: new Date(startDate).toISOString()
    };
    db.seatAssignments.push(asn);

    // Payment(s)
    const totalPrice = plan.price;
    if (payPct > 0) {
      const payAmt = Math.floor(totalPrice * payPct);
      const payment = {
        id: uid('PAY'),
        membershipId: mem.id,
        studentId: student.id,
        amount: payAmt,
        method: ['Cash', 'UPI', 'Card', 'Bank Transfer'][Math.floor(Math.random() * 4)],
        status: 'recorded',
        receiptNumber: `REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`,
        recordedAt: new Date(startDate).toISOString(),
        notes: ''
      };
      db.payments.push(payment);
    }

    return { mem, asn };
  }

  // Assign Branch 1 students to seats
  let seatIdx = 0;
  db.students.filter(s => s.branchId === 'BR-001').forEach((student, i) => {
    if (seatIdx >= br1Seats.length) return;
    const seat = br1Seats[seatIdx++];
    const cfg = membershipConfigs[i % membershipConfigs.length];
    assignStudentSeat(student, seat, cfg.planIdx, cfg.payPct, cfg.startOffset);
  });

  seatIdx = 0;
  db.students.filter(s => s.branchId === 'BR-002').forEach((student, i) => {
    if (seatIdx >= br2Seats.length) return;
    const seat = br2Seats[seatIdx++];
    const cfg = membershipConfigs[i % membershipConfigs.length];
    assignStudentSeat(student, seat, cfg.planIdx, cfg.payPct, cfg.startOffset);
  });

  seatIdx = 0;
  db.students.filter(s => s.branchId === 'BR-003').forEach((student, i) => {
    if (seatIdx >= br3Seats.length) return;
    const seat = br3Seats[seatIdx++];
    const cfg = membershipConfigs[i % membershipConfigs.length];
    assignStudentSeat(student, seat, cfg.planIdx, cfg.payPct, cfg.startOffset);
  });

  // ── Attendance ─────────────────────────────────────────────────
  const today_ = new Date();
  const branchStudents = {
    'BR-001': db.students.filter(s => s.branchId === 'BR-001'),
    'BR-002': db.students.filter(s => s.branchId === 'BR-002'),
    'BR-003': db.students.filter(s => s.branchId === 'BR-003'),
  };

  // Today's attendance
  Object.values(branchStudents).forEach(students => {
    students.forEach((student, i) => {
      if (Math.random() > 0.3) { // 70% attendance today
        const checkIn = new Date(today_);
        checkIn.setHours(6 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0);
        const checkOut = Math.random() > 0.4 ? new Date(checkIn.getTime() + (3 + Math.random() * 6) * 3600000) : null;

        db.attendance.push({
          id: uid('ATT'),
          studentId: student.id,
          date: todayISO,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut?.toISOString() || null,
          status: checkOut ? 'checked-out' : 'checked-in',
          duration: checkOut ? Math.round((checkOut - checkIn) / 60000) : null
        });
      }
    });
  });

  // Past 30 days attendance
  for (let day = 1; day <= 30; day++) {
    const d = new Date(today_);
    d.setDate(d.getDate() - day);
    const dateStr = d.toISOString().split('T')[0];

    db.students.forEach(student => {
      if (Math.random() > 0.35) {
        const checkIn = new Date(d);
        checkIn.setHours(6 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0);
        const checkOut = new Date(checkIn.getTime() + (3 + Math.random() * 7) * 3600000);

        db.attendance.push({
          id: uid('ATT'),
          studentId: student.id,
          date: dateStr,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          status: 'checked-out',
          duration: Math.round((checkOut - checkIn) / 60000)
        });
      }
    });
  }

  // ── Expenses ───────────────────────────────────────────────────
  const expenseCategories = ['Rent', 'Electricity', 'Internet', 'Staff Salary', 'Maintenance', 'Cleaning', 'Furniture', 'Other'];
  const expenseAmounts = { 'Rent': 45000, 'Electricity': 8000, 'Internet': 2500, 'Staff Salary': 35000, 'Maintenance': 5000, 'Cleaning': 3000, 'Furniture': 12000, 'Other': 2000 };

  db.branches.forEach(branch => {
    expenseCategories.forEach((cat, i) => {
      // Monthly for last 3 months
      for (let month = 0; month < 3; month++) {
        const d = new Date(today_);
        d.setDate(1);
        d.setMonth(d.getMonth() - month);
        db.expenses.push({
          id: uid('EXP'),
          branchId: branch.id,
          category: cat,
          amount: expenseAmounts[cat] + Math.floor((Math.random() - 0.5) * expenseAmounts[cat] * 0.2),
          date: d.toISOString().split('T')[0],
          method: ['Cash', 'Bank Transfer', 'UPI'][Math.floor(Math.random() * 3)],
          description: `${cat} for ${d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
          createdAt: d.toISOString()
        });
      }
    });
  });

  // ── Reservations ───────────────────────────────────────────────
  const unreservedSeat1 = br1Seats[br1Seats.length - 1];
  const unreservedSeat2 = br1Seats[br1Seats.length - 2];
  if (unreservedSeat1) {
    const futureStart = addDays(todayISO, 2);
    db.reservations.push({
      id: uid('RES'),
      studentId: db.students[0].id,
      seatId: unreservedSeat1.id,
      startDate: futureStart,
      endDate: addDays(futureStart, 30),
      status: 'upcoming',
      notes: 'Student shifting from another branch',
      createdAt: now()
    });
  }

  // ── Notifications ──────────────────────────────────────────────
  const notifTypes = [
    { type: 'expiry', message: 'Rahul Sharma\'s membership expires in 3 days (Seat A01)', icon: 'clock', read: false, branchId: 'BR-001' },
    { type: 'payment', message: 'Payment pending: Ananya Shah owes ₹2,500 (Seat A04)', icon: 'alert-circle', read: false, branchId: 'BR-001' },
    { type: 'expiry', message: 'Priya Patel\'s membership expires in 5 days (Seat A02)', icon: 'clock', read: false, branchId: 'BR-001' },
    { type: 'reservation', message: 'New reservation for Seat E05 starting Sep 25', icon: 'calendar', read: true, branchId: 'BR-001' },
    { type: 'system', message: 'Daily attendance report ready for Sep 22', icon: 'file-text', read: true, branchId: 'BR-001' },
    { type: 'payment', message: 'Payment received: ₹6,500 from Aarav Mehta', icon: 'check-circle', read: true, branchId: 'BR-001' },
    { type: 'expiry', message: 'Ojas Bhatt\'s membership expires tomorrow', icon: 'clock', read: false, branchId: 'BR-002' },
    { type: 'transfer', message: 'Seat transfer completed: B04 → C02 for Siddharth Wagh', icon: 'arrow-right', read: true, branchId: 'BR-002' },
  ];

  notifTypes.forEach((n, i) => {
    db.notifications.push({
      id: uid('NOTIF'),
      ...n,
      createdAt: new Date(Date.now() - i * 3600000).toISOString()
    });
  });

  // ── Waitlist ───────────────────────────────────────────────────
  db.waitlist.push({
    id: uid('WL'),
    studentId: db.students[db.students.length - 1].id,
    branchId: 'BR-001',
    preferredRoomType: 'silent',
    preferredSeatType: 'window',
    dateRequested: now(),
    priority: 1,
    notes: 'Prefers morning slots',
    status: 'waiting'
  });

  // ── Activity Log ───────────────────────────────────────────────
  const activities = [
    { action: 'seat_assigned', entity: 'seat', description: 'Seat A01 assigned to Rahul Sharma' },
    { action: 'payment_recorded', entity: 'payment', description: 'Payment ₹2,500 received from Priya Patel' },
    { action: 'seat_maintenance', entity: 'seat', description: 'Seat E05 marked for maintenance' },
    { action: 'membership_renewed', entity: 'membership', description: 'Membership renewed for Aarav Mehta' },
    { action: 'student_created', entity: 'student', description: 'New student Ananya Shah added' },
    { action: 'seat_released', entity: 'seat', description: 'Seat C03 released - membership expired' },
    { action: 'payment_recorded', entity: 'payment', description: 'Payment ₹6,500 received from Rohan Verma' },
    { action: 'seat_transferred', entity: 'seat', description: 'Seat transferred B04 → C02 for Siddharth Wagh' },
  ];

  activities.forEach((a, i) => {
    db.activityLog.push({
      id: uid('ACT'),
      ...a,
      userId: 'STF-001',
      entityId: `ENTITY-${i}`,
      timestamp: new Date(Date.now() - i * 1800000).toISOString()
    });
  });

  return db;
}

window.seedDatabase = seedDatabase;
