import React from 'react';

const Skeleton = ({ className = "", ...props }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded ${className}`}
      style={{
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }}
      {...props}
    />
  );
};

const TableSkeleton = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="w-full">
      {/* Table header skeleton */}
      <div className="flex border-b border-gray-200 py-3 px-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-4 flex-1 mr-4"
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>
      
      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex border-b border-gray-100 py-4 px-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-4 flex-1 mr-4"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export { Skeleton, TableSkeleton };
