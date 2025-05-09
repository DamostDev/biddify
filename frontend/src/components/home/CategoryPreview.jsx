// src/components/home/CategoryPreview.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';

const CategoryCardSkeleton = () => (
    <div className="animate-pulse">
        <div className="aspect-[16/10] sm:aspect-video bg-neutral-700 rounded-lg"></div>
        {/* No text skeleton for this version, text is overlay */}
    </div>
);

const CategoryCard = ({ category }) => (
    <Link to={`/category/${category.id}`} className="block group text-center relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow aspect-[16/10] sm:aspect-video bg-neutral-800">
        <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-60 group-hover:opacity-80"/>
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors p-2">
            <h3 className="text-sm sm:text-base font-semibold text-white drop-shadow-lg group-hover:text-yellow-300 transition-colors text-center leading-tight">
                {category.name}
            </h3>
        </div>
    </Link>
);


const CategoryPreview = ({ title, categories, isLoading, className = '', viewAllLink = "/categories" }) => {
  const skeletonCount = 5;
  return (
    <section className={`py-6 sm:py-8 rounded-xl bg-neutral-800 text-neutral-content ${className}`}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-baseline mb-4 sm:mb-5">
          <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
          {/* "Show All" for categories can be added back if needed */}
        </div>
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {isLoading
            ? Array(skeletonCount).fill(null).map((_, index) => <CategoryCardSkeleton key={index} />)
            : categories.slice(0, skeletonCount).map(category => <CategoryCard key={category.id} category={category} />)}
        </div>
      </div>
    </section>
  );
};

export default CategoryPreview;