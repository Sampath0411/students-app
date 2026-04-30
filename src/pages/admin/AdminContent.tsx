import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminAssignments from "./AdminAssignments";
import AdminRecords from "./AdminRecords";
import AdminAnnouncements from "./AdminAnnouncements";

// Wrappers strip the inner AppShell so all three render inside one tabbed page.
const Inner = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const AdminContent = () => {
  return (
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
        <TabsContent value="assignments" className="mt-6">
          <div className="[&_main]:!p-0 [&_aside]:!hidden [&_header]:!hidden [&_nav.fixed]:!hidden [&>div>main]:!pb-0">
            <AdminAssignments />
          </div>
        </TabsContent>
        <TabsContent value="records" className="mt-6">
          <div className="[&_main]:!p-0 [&_aside]:!hidden [&_header]:!hidden [&_nav.fixed]:!hidden [&>div>main]:!pb-0">
            <AdminRecords />
          </div>
        </TabsContent>
        <TabsContent value="announcements" className="mt-6">
          <div className="[&_main]:!p-0 [&_aside]:!hidden [&_header]:!hidden [&_nav.fixed]:!hidden [&>div>main]:!pb-0">
            <AdminAnnouncements />
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default AdminContent;
