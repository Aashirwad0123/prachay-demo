require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

const DEMO_USERS = [
  { name: 'Ravi Employee', email: 'employee@demo.com', role: 'EMPLOYEE', employeeId: 'EMP001', department: 'Engineering' },
  { name: 'Anita Director', email: 'director@demo.com', role: 'DIRECTOR', employeeId: 'DIR001', department: 'Management' },
  { name: 'Suresh Accounts', email: 'accounts@demo.com', role: 'ACCOUNTS', employeeId: 'ACC001', department: 'Finance' },
];

async function seed() {
  await sequelize.sync();
  const hash = await bcrypt.hash('Password@123', 10);
  for (const u of DEMO_USERS) {
    const [user, created] = await User.findOrCreate({
      where: { email: u.email },
      defaults: { ...u, password: hash },
    });
    console.log(`${created ? 'Created' : 'Already exists'}: ${user.email} (${user.role})`);
  }
  await sequelize.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
