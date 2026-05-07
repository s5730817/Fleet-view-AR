// This file contains temporary mock team logic until the database is ready.

const mockTeamMembers = [
  {
    id: "admin-1",
    name: "Admin",
    role: "Admin",
    email: "admin@test.com",
    phone: "07000 000001",
    status: "Active",
  },
  {
    id: "manager-1",
    name: "Manager",
    role: "Manager",
    email: "manager@test.com",
    phone: "07000 000002",
    status: "Active",
  },
  {
    id: "tech-1",
    name: "Tech 1",
    role: "Technician",
    email: "tech1@test.com",
    phone: "07000 000003",
    status: "On Job",
  },
  {
    id: "tech-2",
    name: "Tech 2",
    role: "Technician",
    email: "tech2@test.com",
    phone: "07000 000004",
    status: "On Job",
  },
];

exports.getTeamMembers = async () => {
  return mockTeamMembers;
};