import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} border-2 border-gray-300 border-t-green-500 rounded-full animate-spin ${className}`}></div>
  );
};

interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '' 
}) => {
  return (
    <div className={`${width} ${height} bg-gray-700 rounded skeleton ${className}`}></div>
  );
};

interface SongCardSkeletonProps {
  count?: number;
}

export const SongCardSkeleton: React.FC<SongCardSkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <LoadingSkeleton width="w-16" height="h-16" className="rounded-lg" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton width="w-3/4" height="h-4" />
              <LoadingSkeleton width="w-1/2" height="h-3" />
              <LoadingSkeleton width="w-1/4" height="h-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface AlbumCardSkeletonProps {
  count?: number;
}

export const AlbumCardSkeleton: React.FC<AlbumCardSkeletonProps> = ({ count = 10 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="space-y-3">
            <LoadingSkeleton width="w-full" height="h-32" className="rounded-lg aspect-square" />
            <div className="space-y-2">
              <LoadingSkeleton width="w-full" height="h-4" />
              <LoadingSkeleton width="w-3/4" height="h-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onRetry, 
  className = '' 
}) => {
  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  actionLabel, 
  onAction, 
  icon,
  className = '' 
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
        {icon || (
          <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm12-3c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z" />
          </svg>
        )}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
