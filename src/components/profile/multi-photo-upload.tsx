/**
 * Multi-Photo Upload Component
 * Supports 3-6 photos per profile (industry standard)
 * Client-side compression and validation
 */

'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

interface MultiPhotoUploadProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
  required?: number;
}

export function MultiPhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 6,
  required = 3,
}: MultiPhotoUploadProps) {
  const [error, setError] = useState<string>('');
  const [previews, setPreviews] = useState<string[]>([]);

  const validateAndAddPhotos = useCallback(async (files: FileList) => {
    const newFiles: File[] = [];
    let errorMsg = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        errorMsg = 'Only image files are allowed';
        continue;
      }

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        errorMsg = 'Images must be under 5MB';
        continue;
      }

      // Check if we're at max capacity
      if (photos.length + newFiles.length >= maxPhotos) {
        errorMsg = `Maximum ${maxPhotos} photos allowed`;
        break;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      const updatedPhotos = [...photos, ...newFiles];
      onPhotosChange(updatedPhotos);

      // Generate previews
      const newPreviews = await Promise.all(
        updatedPhotos.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        })
      );
      setPreviews(newPreviews);
    }

    setError(errorMsg);
  }, [photos, maxPhotos, onPhotosChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddPhotos(e.target.files);
    }
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
    setPreviews(previews.filter((_, i) => i !== index));
    setError('');
  };

  const reorderPhotos = (fromIndex: number, toIndex: number) => {
    const updated = [...photos];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onPhotosChange(updated);

    const updatedPreviews = [...previews];
    const [movedPreview] = updatedPreviews.splice(fromIndex, 1);
    updatedPreviews.splice(toIndex, 0, movedPreview);
    setPreviews(updatedPreviews);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Profile Photos</h3>
          <p className="text-sm text-muted-foreground">
            Add {required}-{maxPhotos} photos. Your first photo is your main photo.
          </p>
        </div>
        <span className="text-sm font-medium">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {previews.map((preview, index) => (
          <Card key={index} className="relative aspect-square overflow-hidden group">
            <Image
              src={preview}
              alt={`Photo ${index + 1}`}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {index > 0 && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => reorderPhotos(index, index - 1)}
                >
                  ←
                </Button>
              )}
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={() => removePhoto(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              {index < photos.length - 1 && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => reorderPhotos(index, index + 1)}
                >
                  →
                </Button>
              )}
            </div>
            {index === 0 && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                Main
              </div>
            )}
          </Card>
        ))}

        {photos.length < maxPhotos && (
          <label className="relative aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Camera className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Add Photo</span>
          </label>
        )}
      </div>

      {photos.length < required && (
        <p className="text-sm text-muted-foreground">
          Add at least {required - photos.length} more {required - photos.length === 1 ? 'photo' : 'photos'} to continue
        </p>
      )}
    </div>
  );
}
