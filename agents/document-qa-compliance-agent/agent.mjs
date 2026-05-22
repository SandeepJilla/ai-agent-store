export const documentCorpus = [
  { title: 'Clinic Privacy Policy', citation: 'Clinic Privacy Policy §2.1', text: 'Patient records may only be accessed for a defined care or operations purpose using the minimum necessary standard.' },
  { title: 'Volunteer Handbook', citation: 'Volunteer Handbook p. 7', text: 'Volunteers cannot access patient records unless explicitly authorized, trained, and supervised.' },
  { title: 'HR Handbook', citation: 'HR Handbook §4.3', text: 'Employee files are confidential and retained under role-based access controls.' }
];

export function retrieveDocuments(question = '') {
  const text = question.toLowerCase();
  return documentCorpus.filter((doc) => /patient|clinic|volunteer|privacy|record/.test(text) ? /Clinic|Volunteer/.test(doc.title) : true).slice(0, 2);
}

export function askQuestion(question = '') {
  const citations = retrieveDocuments(question);
  return { question, answer: 'Based on uploaded policies, access should be denied unless the person has a documented role-based need and only the minimum necessary information is used. Volunteers need explicit authorization, training, and supervision before any record access.', citations };
}

export function generateSummary(documentName = 'clinic privacy policy') {
  return `Summary of ${documentName}: access controls, minimum-necessary use, exception handling, and audit requirements.`;
}

export function compareDocuments(a = 'HR handbook', b = 'clinic privacy policy') {
  return { summary: `Key differences between ${a} and ${b}: employee-record retention versus patient privacy, care operations, and access restrictions.`, items: ['Different protected data classes', 'Different approval paths for exceptions', 'Different retention and audit requirements'] };
}

export default { documentCorpus, retrieveDocuments, askQuestion, generateSummary, compareDocuments };
