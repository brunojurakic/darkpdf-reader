import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PdfLoadingCardProps {
  loadingProgress: number;
}

const PdfLoadingCard: React.FC<PdfLoadingCardProps> = ({ loadingProgress }) => (
  <div className="flex-1 flex items-center justify-center p-8">
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Loading PDF...</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <Progress value={loadingProgress} />
        </div>
      </CardContent>
    </Card>
  </div>
);

export default PdfLoadingCard;
