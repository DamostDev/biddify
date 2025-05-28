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
    <Link to={`/category/${category.id}`} className="block group text-center relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out aspect-[16/10] sm:aspect-video bg-neutral-700 transform hover:-translate-y-1">
        <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 opacity-70 group-hover:opacity-90"/>
        <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 transition-all duration-300 ease-in-out">
            <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-md group-hover:text-sky-300 transition-colors text-left leading-tight">
                {category.name}
            </h3>
        </div>
    </Link>
);


const CategoryPreview = ({ title, categories, isLoading, className = '', viewAllLink = "/categories" }) => {
  const skeletonCount = 5;
  return (
    <section className={`py-8 sm:py-10 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-content shadow-xl ${className}`}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-baseline mb-5 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
          {/* "Show All" for categories can be added back if needed */}
        </div>
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
          {isLoading
            ? Array(skeletonCount).fill(null).map((_, index) => <CategoryCardSkeleton key={index} />)
            : categories.slice(0, skeletonCount).map(category => <CategoryCard key={category.id} category={category} />)}
        </div>
      </div>
    </section>
  );
};

export default CategoryPreview;