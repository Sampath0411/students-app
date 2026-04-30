import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentsPanel, RecordsPanel, AnnouncementsPanel } from "./contentPanels";

const AdminContent = () => (
  <AppShell kind="admin">
    <div className="mb-6">
      <h1 className="text-3xl font-bold">Content hub</h1>
      <p className="text-sm text-muted-foreground">Assignments, records and announcements in one place.</p>
    </div>
    <Tabs defaultValue="assignments">
      <TabsList className="grid w-full grid-cols-3 sm:max-w-md">
        <TabsTrigger value="assignments">Assignments</TabsTrigger>
        <TabsTrigger value="records">Records</TabsTrigger>
        <TabsTrigger value="announcements">Announcements</TabsTrigger>
      </TabsList>
      <TabsContent value="assignments" className="mt-6"><AssignmentsPanel /></TabsContent>
      <TabsContent value="records" className="mt-6"><RecordsPanel /></TabsContent>
      <TabsContent value="announcements" className="mt-6"><AnnouncementsPanel /></TabsContent>
    </Tabs>
  </AppShell>
);

export default AdminContent;
