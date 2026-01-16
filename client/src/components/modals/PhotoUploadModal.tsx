import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { Camera, Upload, X, RotateCcw } from 'lucide-react';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUploaded: (photoUrl: string) => void;
  candidateId: number;
}

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

// Helper function to create a canvas from cropped area
function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to maintain aspect ratio of the crop area
  // For square crops, this will be square; for rectangular crops, this preserves the ratio
  canvas.width = crop.width;
  canvas.height = crop.height;

  // Draw the cropped image to canvas maintaining original proportions
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      }
    }, 'image/jpeg', 0.9);
  });
}

export function PhotoUploadModal({ isOpen, onClose, onPhotoUploaded, candidateId }: PhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [lastCrop, setLastCrop] = useState<CropData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setImageSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsUploading(false);
    onClose();
  }, [onClose]);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('invalidFileTypeTitle'),
          description: t('selectImageFile'),
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('fileTooLargeTitle'),
          description: t('imageTooLarge'),
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  // Handle image load for cropping
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Set initial crop to center square
    const crop = centerAspectCrop(width, height, 1); // 1:1 aspect ratio
    setCrop(crop);
  }, []);

  // Handle crop upload
  const handleUpload = useCallback(async () => {
    if (!imgRef.current || !completedCrop || !selectedFile) {
      toast({
        title: t('noCropSelectedTitle'),
        description: t('noCropSelectedDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get cropped image blob
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      // Create form data
      const formData = new FormData();
      formData.append('photo', croppedImageBlob, `candidate-${candidateId}-photo.jpg`);

      // Upload to server
      const response = await fetch(`/api/candidates/${candidateId}/photo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const result = await response.json();
      
      toast({
        title: t('photoUploadedTitle'),
        description: t('photoUploadedDescription'),
      });

      onPhotoUploaded(result.photoUrl);
      handleClose();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: t('uploadFailed'),
        description: t('uploadFailedDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [candidateId, completedCrop, selectedFile, onPhotoUploaded, handleClose, toast]);

  // Handle file input click
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  // Reset and select new image
  const handleSelectNew = () => {
    setSelectedFile(null);
    setImageSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    handleFileInputClick();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('uploadCandidatePhoto')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!imageSrc ? (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={handleFileInputClick}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">Click to select a photo</p>
                <p className="text-sm text-gray-500 mt-1">
                  JPG, PNG up to 5MB
                </p>
              </div>
              
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-medium">Crop your photo (1:1 ratio)</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectNew}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Select New
                </Button>
              </div>

              <div className="max-h-96 overflow-auto border rounded-lg">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => {
                    setCompletedCrop(c);
                    setLastCrop({ x: c.x, y: c.y, width: c.width, height: c.height });
                  }}
                  aspect={1} // 1:1 aspect ratio
                  circularCrop={false}
                  keepSelection={true}
                  minWidth={100}
                  minHeight={100}
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    style={{ maxHeight: '400px', width: 'auto' }}
                  />
                </ReactCrop>
              </div>

              <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                <p className="font-medium">Tips:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Drag the corners to resize the crop area</li>
                  <li>Drag the crop area to reposition</li>
                  <li>The image will be cropped to a square (1:1) format</li>
                  <li>Make sure the face is clearly visible in the crop area</li>
                </ul>
                {lastCrop && (
                  <p className="mt-2 text-xs text-blue-600">
                    Crop size: {Math.round(lastCrop.width)}×{Math.round(lastCrop.height)}px
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          
          {imageSrc && (
            <Button 
              onClick={handleUpload} 
              disabled={!completedCrop || isUploading}
              className="min-w-32"
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('uploadPhoto')}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
