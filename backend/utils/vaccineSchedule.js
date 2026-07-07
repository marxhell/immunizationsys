/**
 * Vaccine Schedule Engine
 * Generates age-appropriate vaccine recommendations based on the child's date of birth.
 * Follows the Kenya Expanded Programme on Immunization (KEPI) schedule.
 */

const KENYA_VACCINE_SCHEDULE = [
  { vaccineName: 'BCG', doseNumber: 1, dueAgeWeeks: 0, dueAgeMonths: 0, description: 'At birth (or first contact)' },
  { vaccineName: 'OPV', doseNumber: 0, dueAgeWeeks: 0, dueAgeMonths: 0, description: 'At birth (OPV0)' },
  { vaccineName: 'OPV', doseNumber: 1, dueAgeWeeks: 6, dueAgeMonths: 1.5, description: '6 weeks' },
  { vaccineName: 'OPV', doseNumber: 2, dueAgeWeeks: 10, dueAgeMonths: 2.5, description: '10 weeks' },
  { vaccineName: 'OPV', doseNumber: 3, dueAgeWeeks: 14, dueAgeMonths: 3.5, description: '14 weeks' },
  { vaccineName: 'Pentavalent', doseNumber: 1, dueAgeWeeks: 6, dueAgeMonths: 1.5, description: '6 weeks' },
  { vaccineName: 'Pentavalent', doseNumber: 2, dueAgeWeeks: 10, dueAgeMonths: 2.5, description: '10 weeks' },
  { vaccineName: 'Pentavalent', doseNumber: 3, dueAgeWeeks: 14, dueAgeMonths: 3.5, description: '14 weeks' },
  { vaccineName: 'PCV', doseNumber: 1, dueAgeWeeks: 6, dueAgeMonths: 1.5, description: '6 weeks' },
  { vaccineName: 'PCV', doseNumber: 2, dueAgeWeeks: 10, dueAgeMonths: 2.5, description: '10 weeks' },
  { vaccineName: 'PCV', doseNumber: 3, dueAgeWeeks: 14, dueAgeMonths: 3.5, description: '14 weeks' },
  { vaccineName: 'Rotavirus', doseNumber: 1, dueAgeWeeks: 6, dueAgeMonths: 1.5, description: '6 weeks' },
  { vaccineName: 'Rotavirus', doseNumber: 2, dueAgeWeeks: 10, dueAgeMonths: 2.5, description: '10 weeks' },
  { vaccineName: 'IPV', doseNumber: 1, dueAgeWeeks: 14, dueAgeMonths: 3.5, description: '14 weeks' },
  { vaccineName: 'Measles', doseNumber: 1, dueAgeWeeks: 36, dueAgeMonths: 9, description: '9 months' },
  { vaccineName: 'Measles', doseNumber: 2, dueAgeWeeks: 72, dueAgeMonths: 18, description: '18 months' },
  { vaccineName: 'Hepatitis B', doseNumber: 1, dueAgeWeeks: 0, dueAgeMonths: 0, description: 'At birth (within 24 hours)' },
  { vaccineName: 'Hepatitis B', doseNumber: 2, dueAgeWeeks: 6, dueAgeMonths: 1.5, description: '6 weeks' },
  { vaccineName: 'Hepatitis B', doseNumber: 3, dueAgeWeeks: 14, dueAgeMonths: 3.5, description: '14 weeks' },
  { vaccineName: 'Yellow Fever', doseNumber: 1, dueAgeWeeks: 36, dueAgeMonths: 9, description: '9 months' },
  { vaccineName: 'Vitamin A', doseNumber: 1, dueAgeWeeks: 24, dueAgeMonths: 6, description: '6 months' },
  { vaccineName: 'Vitamin A', doseNumber: 2, dueAgeWeeks: 52, dueAgeMonths: 12, description: '12 months' },
];

/**
 * Calculate a child's age in weeks
 */
function getAgeInWeeks(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const diffMs = now - dob;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
}

/**
 * Calculate a child's age in months
 */
function getAgeInMonths(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12;
  months += now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Get the recommended vaccines for a child based on their date of birth
 * Returns vaccines that are due, upcoming, and completed
 */
function getRecommendedVaccines(dateOfBirth, administeredRecords = []) {
  const ageWeeks = getAgeInWeeks(dateOfBirth);
  const ageMonths = getAgeInMonths(dateOfBirth);

  // Extract already administered vaccine-dose combinations
  const administered = new Set();
  (administeredRecords || []).forEach((record) => {
    if (record.status === 'administered') {
      administered.add(`${record.vaccineName}-dose${record.doseNumber}`);
    }
  });

  const due = [];
  const upcoming = [];
  const completed = [];

  KENYA_VACCINE_SCHEDULE.forEach((scheduleItem) => {
    const key = `${scheduleItem.vaccineName}-dose${scheduleItem.doseNumber}`;
    const isAdministered = administered.has(key);

    if (isAdministered) {
      completed.push({ ...scheduleItem, status: 'completed' });
      return;
    }

    // Due: age is at or past the recommended age
    if (ageWeeks >= scheduleItem.dueAgeWeeks) {
      due.push({ ...scheduleItem, status: 'due', ageAtDue: scheduleItem.dueAgeWeeks });
    } else {
      // Upcoming: not yet due
      upcoming.push({
        ...scheduleItem,
        status: 'upcoming',
        dueDate: new Date(new Date(dateOfBirth).getTime() + scheduleItem.dueAgeWeeks * 7 * 24 * 60 * 60 * 1000),
      });
    }
  });

  return { due, upcoming, completed, ageWeeks, ageMonths };
}

module.exports = { getRecommendedVaccines, getAgeInWeeks, getAgeInMonths, KENYA_VACCINE_SCHEDULE };