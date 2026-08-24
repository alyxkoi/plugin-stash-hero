import type { Product } from "@/lib/mock-data";
import { useSalePricing } from "@/lib/sale-pricing";

type ProductPriceProps = {
  product: Product;
  className?: string;
  currentClassName?: string;
  retailClassName?: string;
};

export function ProductPrice({
  product,
  className = "",
  currentClassName = "",
  retailClassName = "",
}: ProductPriceProps) {
  const { finalPrice, pct } = useSalePricing(product);
  const hasRetail = Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
  const retailPrice = hasRetail ? product.compareAtPrice : pct > 0 ? product.price : undefined;
  const currentPrice = pct > 0 ? finalPrice : product.price;

  if (product.isFree) {
    return <span className={`product-price ${className}`}><strong className={currentClassName}>FREE</strong></span>;
  }

  return (
    <span className={`product-price ${className}`}>
      {retailPrice && (
        <del className={`product-price__retail ${retailClassName}`}>
          ${retailPrice.toFixed(2)}
        </del>
      )}
      <strong className={`product-price__current ${currentClassName}`}>
        ${currentPrice.toFixed(2)}
      </strong>
    </span>
  );
}
