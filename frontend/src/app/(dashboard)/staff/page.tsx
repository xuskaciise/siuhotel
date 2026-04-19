import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffPage() {
  return (
    <Card className="shadow-elevation-2 ring-0">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-medium">Staff</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Team directory will live here.</p>
      </CardContent>
    </Card>
  );
}
