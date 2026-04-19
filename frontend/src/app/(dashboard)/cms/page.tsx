import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CmsPage() {
  return (
    <Card className="shadow-elevation-2 ring-0">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-medium">Website CMS</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Marketing content will live here.</p>
      </CardContent>
    </Card>
  );
}
