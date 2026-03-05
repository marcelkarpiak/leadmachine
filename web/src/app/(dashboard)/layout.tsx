import Sidebar from "@/components/ui/Sidebar";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <Sidebar />
            <main className="flex-1 flex flex-col h-full bg-bg-base overflow-y-auto p-8">
                {children}
            </main>
        </>
    );
}
