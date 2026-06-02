// courses.js — groups modules into named courses for the landing page.
// The COURSES array controls which modules belong to each course section.
// Add a new course object when a new course starts; append module IDs as chapters are built.
const COURSES = [
  {
    id:      'svzth',
    title:   'SystemVerilog Zero to Hero',
    icon:    '🚦',
    modules: ['msv1']
  },
  {
    id:      'i2c',
    title:   'I²C Design',
    icon:    '🔗',
    modules: ['i2c1']
  }
];
if (typeof module !== 'undefined') module.exports = { COURSES };
