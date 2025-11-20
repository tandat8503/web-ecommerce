import React from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Component hiển thị rating stars
 * @param {number} rating - Điểm đánh giá (0-5)
 * @param {number} size - Kích thước icon (default: 20)
 * @param {string} className - CSS class tùy chỉnh
 * @param {boolean} showNumber - Hiển thị số rating (default: false)
 */
export const RatingStars = ({ rating = 0, size = 20, className = "", showNumber = false }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          size={size}
          className="fill-yellow-400 text-yellow-400"
        />
      ))}
      
      {/* Half star */}
      {hasHalfStar && (
        <StarHalf
          size={size}
          className="fill-yellow-400 text-yellow-400"
        />
      )}
      
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          size={size}
          className="fill-gray-200 text-gray-200"
        />
      ))}
      
      {/* Show number */}
      {showNumber && (
        <span className="ml-1 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

/**
 * Component chọn rating (interactive)
 * @param {number} value - Rating hiện tại (0-5)
 * @param {function} onChange - Callback khi thay đổi rating
 * @param {number} size - Kích thước icon (default: 24)
 * @param {string} className - CSS class tùy chỉnh
 * @param {boolean} disabled - Disable interaction
 */
export const RatingSelector = ({ 
  value = 0, 
  onChange, 
  size = 24, 
  className = "",
  disabled = false 
}) => {
  const [hoverRating, setHoverRating] = React.useState(0);

  const handleClick = (rating) => {
    if (!disabled && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating) => {
    if (!disabled) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || value;

  return (
    <div 
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          className={cn(
            "transition-colors cursor-pointer",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Star
            size={size}
            className={cn(
              star <= displayRating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200",
              !disabled && "hover:fill-yellow-300 hover:text-yellow-300"
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default RatingStars;

