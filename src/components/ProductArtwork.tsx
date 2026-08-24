import { PackageOpen } from "lucide-react";
import { useState, type ReactNode } from "react";

type ProductArtworkProps = {
  src?: string | null;
  name: string;
  gradient?: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  onLoad?: () => void;
  children?: ReactNode;
};

export function ProductArtwork({
  src,
  name,
  className = "",
  imageClassName = "",
  loading = "lazy",
  onLoad,
  children,
}: ProductArtworkProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={`pwh-product-art ${className}`}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={`${name} product artwork`}
          loading={loading}
          className={`pwh-product-art__image ${imageClassName}`}
          onError={() => setFailed(true)}
          onLoad={onLoad}
        />
      ) : (
        <div className="pwh-product-art__fallback" role="img" aria-label={`${name} artwork unavailable`}>
          <PackageOpen aria-hidden="true" />
          <span>{name}</span>
        </div>
      )}
      {children}
    </div>
  );
}
