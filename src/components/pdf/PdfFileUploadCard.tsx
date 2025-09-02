import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Upload } from "lucide-react"

interface PdfFileUploadCardProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const PdfFileUploadCard: React.FC<PdfFileUploadCardProps> = ({
  onFileChange,
}) => (
  <div className="flex-1 flex items-center justify-center p-8">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload PDF Document
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          className="w-full"
        />
      </CardContent>
    </Card>
  </div>
)

export default PdfFileUploadCard
