import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomersPage() {
  return (
    <Card className="shadow-elevation-2 ring-0">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-medium">Customers</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Guest profiles will live here.</p>
      </CardContent>
    </Card>
  );
}
