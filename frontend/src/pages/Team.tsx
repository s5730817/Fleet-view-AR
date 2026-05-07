import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Mail,
  Phone,
  Shield,
  Circle,
} from "lucide-react";

import {
  getTeamMembers,
  type TeamMember,
  type TeamRole,
  type TeamStatus,
} from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";

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
    case "Manager":
      return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
    case "Technician":
      return "bg-green-500/10 text-green-500 border-green-500/20";
  }
};

const Team = () => {
  const {
    data: teamMembers = [],
    isLoading,
    error,
  } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: getTeamMembers,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-foreground">Loading team...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-red-500">Error loading team</p>
      </div>
    );
  }

  const activeCount = teamMembers.filter(
    (member) => member.status === "Active"
  ).length;

  const onJobCount = teamMembers.filter(
    (member) => member.status === "On Job"
  ).length;

  const technicianCount = teamMembers.filter(
    (member) => member.role === "Technician"
  ).length;

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
              View system users, roles and current availability.
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
              {activeCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Technicians</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">
              {technicianCount}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Team Directory
            </h2>
            <p className="text-sm text-muted-foreground">
              Staff contact details and current availability.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            {onJobCount} currently on job
          </div>
        </div>

        <div className="divide-y">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {member.name}
                  </h3>

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
                    <Mail className="h-3.5 w-3.5" />
                    {member.email}
                  </span>

                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {member.phone}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Team;