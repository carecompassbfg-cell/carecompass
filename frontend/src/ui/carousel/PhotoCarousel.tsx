import Carousel from "./Carousel";
import Image from "next/image";
import { t } from "@/i18n";

export default function PhotoCarousel({ photos }: { photos: string[] }) {
  return (
    <Carousel
      slides={photos.map((photo, index) => (
        <Image
          key={index}
          src={photo}
          alt={t("provider.photoAlt")}
          width={4000}
          height={1080}
          className="aspect-[4/3] w-full object-contain"
        />
      ))}
    />
  );
}
