// frontend/src/components/home/CategoryPreview.jsx
import React from 'react';
import { Link } from 'react-router-dom';
// FiChevronRight is not used here, can be removed if not needed for a "Show All" link in this component
// import { FiChevronRight } from 'react-icons/fi';

const CategoryCardSkeleton = () => (
    <div className="animate-pulse">
        {/* Adjusted aspect ratio to be slightly wider, more common for category previews */}
        <div className="aspect-[3/2] sm:aspect-[16/9] bg-neutral-700 rounded-lg"></div>
    </div>
);

const CategoryCard = ({ category }) => (
    // Make sure category.id is passed for the link (e.g., category.category_id or a slug)
    <Link
        to={`/category/${category.id}`} // Use category.id (which we map from category_id)
        className="block group text-center relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out aspect-[3/2] sm:aspect-[16/9] bg-neutral-700 transform hover:-translate-y-1"
    >
        <img
            src={category.imageUrl} // Use category.imageUrl
            alt={category.name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 opacity-70 group-hover:opacity-85" // Slightly adjusted hover opacity
        />
        <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/75 via-black/40 to-transparent p-3 sm:p-4 transition-all duration-300 ease-in-out">
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-white drop-shadow-md group-hover:text-sky-300 transition-colors text-left leading-tight line-clamp-2">
                {category.name}
            </h3>
        </div>
    </Link>
);


const CategoryPreview = ({ title, categories, isLoading, className = '' }) => {
  // Show 3 to 5 categories typically, adjust skeleton count accordingly
  const skeletonCount = 5; // Or 3, 4 depending on your desired default row look

  return (
    // Styling for the section container
    <section className={`py-8 sm:py-10 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-content shadow-xl ${className}`}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-baseline mb-5 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
          {/* "Show All" link for categories could be added here if needed */}
          {/* e.g., <Link to="/categories" className="text-xs sm:text-sm font-semibold text-sky-400 hover:text-sky-300">Show All <FiChevronRight className="inline"/></Link> */}
        </div>
        {/* Responsive grid for category cards */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {isLoading
            ? Array(skeletonCount).fill(null).map((_, index) => <CategoryCardSkeleton key={`cat-skel-${index}`} />)
            : categories.slice(0, skeletonCount).map(category => ( // Ensure categories is an array
                <CategoryCard key={category.id || category.category_id} category={category} />
              ))}
        </div>
        { !isLoading && categories.length === 0 && (
            <p className="text-center text-neutral-400 py-4">No categories to display currently.</p>
        )}
      </div>
    </section>
  );
};

export default CategoryPreview;