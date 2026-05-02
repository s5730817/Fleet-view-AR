import {
  Users,
  Mail,
  Phone,
  Building2,
  Shield,
  Circle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TeamRole = "Admin" | "Supervisor" | "Technician";
type TeamStatus = "Active" | "On Job" | "Offline";

interface TeamMember {
  id: number;
  name: string;
  role: TeamRole;
  depot: string;
  email: string;
  phone: string;
  status: TeamStatus;
}

const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Alex Morgan",
    role: "Admin",
    depot: "Depot 1",
    email: "alex.morgan@transitlens.co.uk",
    phone: "07123 456789",
    status: "Active",
  },
  {
    id: 2,
    name: "Jamie Carter",
    role: "Supervisor",
    depot: "Depot 2",
    email: "jamie.carter@transitlens.co.uk",
    phone: "07234 567890",
    status: "On Job",
  },
  {
    id: 3,
    name: "Taylor Singh",
    role: "Technician",
    depot: "Depot 3",
    email: "taylor.singh@transitlens.co.uk",
    phone: "07345 678901",
    status: "Active",
  },
  {
    id: 4,
    name: "Morgan Lee",
    role: "Technician",
    depot: "Depot 6",
    email: "morgan.lee@transitlens.co.uk",
    phone: "07456 789012",
    status: "Offline",
  },
];

const getStatusClass = (status: TeamStatus) => {
  switch (status) {
    case "Active":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "On Job":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "Offline":
      return "bg-muted text-muted-foreground border-border";
  }
};

const getRoleClass = (role: TeamRole) => {
  switch (role) {
    case "Admin":
      return "bg-primary/10 text-primary border-primary/20";
    case "Supervisor":
      return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
    case "Technician":
      return "bg-green-500/10 text-green-500 border-green-500/20";
  }
};

const Team = () => {
  return (
    <main className="container max-w-6xl px-4 py-6 space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">Team</h1>
            <p className="text-sm text-muted-foreground">
              Manage technicians, supervisors and depot assignments
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Team Members</p>
            <p className="mt-2 text-3xl font-bold">{teamMembers.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Active Now</p>
            <p className="mt-2 text-3xl font-bold text-green-500">
              {teamMembers.filter((member) => member.status === "Active").length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">On Job</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">
              {teamMembers.filter((member) => member.status === "On Job").length}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Team Directory</h2>
            <p className="text-sm text-muted-foreground">
              Staff contact details and current availability
            </p>
          </div>

          <Button>Add Member</Button>
        </div>

        <div className="divide-y">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{member.name}</h3>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${getRoleClass(
                      member.role
                    )}`}
                  >
                    <Shield className="h-3 w-3" />
                    {member.role}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${getStatusClass(
                      member.status
                    )}`}
                  >
                    <Circle className="h-2.5 w-2.5 fill-current" />
                    {member.status}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {member.depot}
                  </span>

                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {member.email}
                  </span>

                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {member.phone}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  View
                </Button>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Team;