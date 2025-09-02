import React from "react"
import { Card, CardContent } from "@/components/ui/card"

interface PdfErrorCardProps {
  error: string
}

const PdfErrorCard: React.FC<PdfErrorCardProps> = ({ error }) => (
  <div className="flex-1 flex items-center justify-center p-8">
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      </CardContent>
    </Card>
  </div>
)

export default PdfErrorCard
