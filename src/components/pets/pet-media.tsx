import Image from "next/image";
import type { Pet } from "@/lib/pets/types";
import { cn } from "@/lib/utils";
import { PetIllustration } from "./pet-illustration";

/**
 * The pet's cover: its photo when one exists, otherwise the placeholder
 * illustration. The parent must be `relative` with a fixed aspect ratio.
 */
export function PetMedia({
  pet,
  alt,
  sizes,
  className,
  priority,
}: {
  pet: Pick<Pet, "photos" | "species" | "look">;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const photo = pet.photos[0];
  if (photo) {
    return <Image src={photo} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
  }
  return <PetIllustration species={pet.species} look={pet.look} title={alt} className={className} />;
}
