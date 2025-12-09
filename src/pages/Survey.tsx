import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, Eye } from "lucide-react";
import { SurveyCreate } from "@/components/survey/SurveyCreate";
import { SurveyView } from "@/components/survey/SurveyView";

export default function Survey() {
  return (
    <PageLayout>
      <div className="container py-6">
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Create Link
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Page
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            <SurveyCreate />
          </TabsContent>
          
          <TabsContent value="view">
            <SurveyView />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
