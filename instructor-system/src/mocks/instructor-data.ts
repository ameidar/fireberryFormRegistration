// Mock data for development and testing

export const mockInstructors = [
  {
    instructorid: "INST001",
    name: "דוד כהן",
    emailaddress1: "david.cohen@example.com",
    telephone1: "+972-50-1234567",
    pcfsystemfield247: "123456789", // Valid Israeli ID
    pcfsystemfield248: "CERT2024001",
    pcfsystemfield249: "מתמטיקה",
    pcfsystemfield250: "בכיר",
    statuscode: 1,
    createdon: "2024-01-15T10:00:00Z",
    modifiedon: "2024-01-15T10:00:00Z"
  },
  {
    instructorid: "INST002",
    name: "שרה לוי",
    emailaddress1: "sara.levi@example.com",
    telephone1: "+972-52-9876543",
    pcfsystemfield247: "987654321", // Valid Israeli ID
    pcfsystemfield248: "CERT2024002",
    pcfsystemfield249: "פיזיקה",
    pcfsystemfield250: "בכיר",
    statuscode: 1,
    createdon: "2024-02-01T08:30:00Z",
    modifiedon: "2024-02-01T08:30:00Z"
  },
  {
    instructorid: "INST003",
    name: "מיכל אברהם",
    emailaddress1: "michal.abraham@example.com",
    telephone1: "+972-54-5555555",
    pcfsystemfield247: "555444333", // Valid Israeli ID
    pcfsystemfield248: "CERT2024003",
    pcfsystemfield249: "כימיה",
    pcfsystemfield250: "זוטר",
    statuscode: 1,
    createdon: "2024-01-20T14:15:00Z",
    modifiedon: "2024-01-20T14:15:00Z"
  },
  {
    instructorid: "INST004",
    name: "אהרון גרין",
    emailaddress1: "aaron.green@example.com",
    telephone1: "+972-53-1111111",
    pcfsystemfield247: "111222333", // Valid Israeli ID
    pcfsystemfield248: "CERT2024004",
    pcfsystemfield249: "ביולוגיה",
    pcfsystemfield250: "בכיר",
    statuscode: 1,
    createdon: "2023-12-01T09:00:00Z",
    modifiedon: "2023-12-01T09:00:00Z"
  }
];

export const mockSessions = [
  {
    customobject1000id: "SESSION001",
    name: "מתמטיקה למתקדמים - סמסטר א'",
    description: "קורס מתמטיקה מתקדם לתלמידי כיתות י'-יב'",
    pcfsystemfield37: 1, // active
    pcfsystemfield549: "running",
    startdate: "2024-03-01T08:00:00Z",
    enddate: "2024-06-30T17:00:00Z",
    pcfsystemfield251: "INST001", // instructor ID
    pcfsystemfield252: 25, // student count
    pcfsystemfield253: 30, // max capacity
    pcfsystemfield254: "בניין א' - חדר 101",
    pcfsystemfield255: "שיעורים בימי ראשון ורביעי 16:00-18:00",
    createdon: "2024-02-15T10:00:00Z",
    modifiedon: "2024-03-01T08:00:00Z"
  },
  {
    customobject1000id: "SESSION002",
    name: "פיזיקה יישומית",
    description: "קורס פיזיקה עם דגש על ניסויים מעבדה",
    pcfsystemfield37: 1, // active
    pcfsystemfield549: "running",
    startdate: "2024-02-15T09:00:00Z",
    enddate: "2024-05-15T18:00:00Z",
    pcfsystemfield251: "INST002", // instructor ID
    pcfsystemfield252: 18, // student count
    pcfsystemfield253: 20, // max capacity
    pcfsystemfield254: "מעבדת פיזיקה",
    pcfsystemfield255: "שיעורים בימי שלישי וחמישי 14:00-16:00",
    createdon: "2024-02-01T11:00:00Z",
    modifiedon: "2024-02-15T09:00:00Z"
  },
  {
    customobject1000id: "SESSION003",
    name: "כימיה אורגנית - בסיס",
    description: "מבוא לכימיה אורגנית לתלמידי תיכון",
    pcfsystemfield37: 0, // inactive
    pcfsystemfield549: "pending",
    startdate: "2024-04-01T10:00:00Z",
    enddate: "2024-07-01T17:00:00Z",
    pcfsystemfield251: "INST003", // instructor ID
    pcfsystemfield252: 0, // student count
    pcfsystemfield253: 25, // max capacity
    pcfsystemfield254: "מעבדת כימיה",
    pcfsystemfield255: "הכשרת המעבדה בתהליך",
    createdon: "2024-03-01T12:00:00Z",
    modifiedon: "2024-03-15T10:00:00Z"
  },
  {
    customobject1000id: "SESSION004",
    name: "ביולוgia מולקולרית",
    description: "קורס מתקדם בביולוגיה מולקולרית וגנטיקה",
    pcfsystemfield37: 2, // completed
    pcfsystemfield549: "completed",
    startdate: "2023-10-01T08:00:00Z",
    enddate: "2024-01-31T17:00:00Z",
    pcfsystemfield251: "INST004", // instructor ID
    pcfsystemfield252: 22, // student count
    pcfsystemfield253: 25, // max capacity
    pcfsystemfield254: "בניין ב' - חדר 205",
    pcfsystemfield255: "קורס הושלם בהצלחה - 95% שיעור הצלחה",
    createdon: "2023-09-01T09:00:00Z",
    modifiedon: "2024-02-01T16:00:00Z"
  },
  {
    customobject1000id: "SESSION005",
    name: "מתמטיקה בסיסית",
    description: "קורס מתמטיקה לכיתות ח'-ט'",
    pcfsystemfield37: 1, // active
    pcfsystemfield549: "running",
    startdate: "2024-02-01T14:00:00Z",
    enddate: "2024-05-31T16:00:00Z",
    pcfsystemfield251: "INST001", // instructor ID
    pcfsystemfield252: 15, // student count
    pcfsystemfield253: 20, // max capacity
    pcfsystemfield254: "בניין א' - חדר 203",
    pcfsystemfield255: "שיעורים בימי שני וחמישי 14:00-15:30",
    createdon: "2024-01-15T13:00:00Z",
    modifiedon: "2024-02-01T14:00:00Z"
  }
];

export const mockStudents = [
  {
    id: "STUDENT001",
    name: "יוני משה",
    email: "yoni.moshe@example.com",
    phone: "+972-50-1111111",
    status: "active",
    registrationDate: "2024-03-01T10:00:00Z",
    sessionId: "SESSION001"
  },
  {
    id: "STUDENT002",
    name: "תמר כהן",
    email: "tamar.cohen@example.com",
    phone: "+972-52-2222222",
    status: "active",
    registrationDate: "2024-03-02T11:00:00Z",
    sessionId: "SESSION001"
  },
  {
    id: "STUDENT003",
    name: "רועי לוי",
    email: "roi.levi@example.com",
    phone: "+972-54-3333333",
    status: "completed",
    registrationDate: "2024-02-15T09:00:00Z",
    completionDate: "2024-05-15T17:00:00Z",
    sessionId: "SESSION002"
  },
  {
    id: "STUDENT004",
    name: "נועה אברהם",
    email: "noa.abraham@example.com",
    phone: "+972-53-4444444",
    status: "active",
    registrationDate: "2024-02-16T10:30:00Z",
    sessionId: "SESSION002"
  },
  {
    id: "STUDENT005",
    name: "עמיר דוד",
    email: "amir.david@example.com",
    phone: "+972-50-5555555",
    status: "dropped",
    registrationDate: "2023-10-01T08:00:00Z",
    sessionId: "SESSION004",
    notes: "עזב בשל בעיות אישיות"
  }
];

// Default export for the entire mock dataset
export default {
  instructors: mockInstructors,
  sessions: mockSessions,
  students: mockStudents,

  // Helper functions for testing
  getInstructorByCredentials: (name: string, idNumber: string) => {
    return mockInstructors.find(instructor =>
      instructor.name === name && instructor.pcfsystemfield247 === idNumber
    );
  },

  getSessionsByInstructor: (instructorId: string) => {
    return mockSessions.filter(session => session.pcfsystemfield251 === instructorId);
  },

  getStudentsBySession: (sessionId: string) => {
    return mockStudents.filter(student => student.sessionId === sessionId);
  },

  // Sample valid login credentials for testing
  validCredentials: [
    { name: "דוד כהן", idNumber: "123456789" },
    { name: "שרה לוי", idNumber: "987654321" },
    { name: "מיכל אברהם", idNumber: "555444333" },
    { name: "אהרון גרין", idNumber: "111222333" }
  ]
};