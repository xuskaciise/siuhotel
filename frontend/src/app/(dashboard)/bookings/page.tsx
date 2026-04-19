import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BookingsPage() {
  return (
    <Card className="shadow-elevation-2 ring-0">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-medium">Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Booking management will live here.</p>
      </CardContent>
    </Card>
  );
}
