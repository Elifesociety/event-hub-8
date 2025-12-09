import { PageLayout } from "@/components/layout/PageLayout";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { CalendarDays, Camera, ClipboardList, Store } from "lucide-react";

const modules = [
  {
    title: "Program Scheduling",
    description: "Manage event programs, assign dates, times, and venues with location mapping.",
    icon: CalendarDays,
    href: "/programs",
    color: "primary" as const
  },
  {
    title: "Photo Gallery",
    description: "Upload and view event photos and memories from the celebration.",
    icon: Camera,
    href: "/photo-gallery",
    color: "primary" as const
  },
  {
    title: "Survey",
    description: "Share your feedback and help us improve future events.",
    icon: ClipboardList,
    href: "/survey",
    color: "accent" as const
  },
  {
    title: "Stall Enquiry",
    description: "Inquire about stall availability and registration details.",
    icon: Store,
    href: "/stall-enquiry",
    color: "warning" as const
  }
];

export default function Index() {

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-12 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              സംരംഭക മേള 2025 -26
              <span className="block mt-2 gradient-text">കൂട്ടായ്മ</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              2030 ഓടെ കേരളത്തെ ഒരു വലിയ പ്രൊഡക്ഷൻ ഹബ്ബ് ആക്കി മാറ്റണം —
              ഇത് ഒരു ലക്ഷ്യംമാത്രമല്ല… ഒരു പ്രസ്ഥാനം ആണ്.
            </p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </section>

      {/* Modules Section */}
      <section className="container py-12 md:py-16">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Features
          </h2>
          <p className="mt-2 text-muted-foreground">
            Select a feature to get started
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <ModuleCard key={module.title} {...module} delay={index * 100} />
          ))}
        </div>
      </section>
    </PageLayout>
  );
}