// frontend/src/pages/dashboard/DashboardHomeContent.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiDollarSign, FiArchive, FiUsers, FiActivity, FiPlayCircle, FiBookOpen, FiHelpCircle, FiExternalLink, FiArrowRight, FiTrendingUp, FiPackage, FiFilm, FiAlertCircle, FiPlusSquare,FiTv, FiBox } from 'react-icons/fi'; // Added FiPackage, FiFilm
import useAuthStore from '../../services/authStore';
import { getDashboardSummaryData } from '../../services/userService'; // Import the service
import { format, formatDistanceToNow } from 'date-fns'; // For date formatting

const StatCard = ({ title, value, icon, unit = '', color = 'bg-primary', textColor = 'text-primary-content', trend, trendColor = 'text-success' }) => (
  <div className={`card ${color} ${textColor} shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1`}>
    <div className="card-body p-5">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-3 rounded-full ${color === 'bg-base-100' ? 'bg-primary/10' : 'bg-black/10'}`}>
            {React.createElement(icon, { className: `w-6 h-6 ${color === 'bg-base-100' ? 'text-primary' : ''}`})}
        </div>
        {trend && <div className={`text-xs font-semibold ${trendColor}`}>{trend}</div>}
      </div>
      <h3 className="text-3xl font-bold">
        {unit}{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}
      </h3>
      <p className="text-xs uppercase tracking-wider opacity-80">{title}</p>
    </div>
  </div>
);

const LearnCard = ({ title, description, link, icon }) => (
    <Link to={link} className="card bg-base-100 hover:bg-base-200/70 transition-all duration-200 shadow-lg hover:shadow-xl group border border-base-300/50">
        <div className="card-body p-5">
            <div className="flex items-center gap-3 mb-2">
                {React.createElement(icon, {className: "w-8 h-8 text-secondary group-hover:text-secondary-focus transition-colors"})}
                <h3 className="card-title text-md font-semibold text-base-content group-hover:text-secondary-focus">{title}</h3>
            </div>
            <p className="text-sm text-base-content/80 line-clamp-3">{description}</p>
             <div className="card-actions justify-end mt-3">
                <span className="text-xs font-medium text-secondary group-hover:underline">Learn More <FiArrowRight className="inline ml-1" size={12}/></span>
            </div>
        </div>
    </Link>
);

const ActivityItem = ({ activity }) => {
    let icon, color;
    switch (activity.type) {
        case 'sale': icon = <FiDollarSign/>; color = 'text-success'; break;
        case 'listing': icon = <FiPackage/>; color = 'text-info'; break;
        case 'draft': icon = <FiPackage/>; color = 'text-neutral-focus'; break;
        default: icon = <FiActivity/>; color = 'text-primary';
    }

    return (
        <li className="flex items-center space-x-3 py-2.5 border-b border-base-300/50 last:border-b-0">
            <div className={`p-2 rounded-full bg-opacity-10 ${
                activity.type === 'sale' ? 'bg-success' : activity.type === 'listing' ? 'bg-info' : 'bg-primary'
            }`}>
                {React.cloneElement(icon, { className: `w-4 h-4 ${color}` })}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-base-content truncate" title={activity.description}>{activity.description}</p>
                <p className="text-xs text-base-content/60">{formatDistanceToNow(new Date(activity.time), { addSuffix: true })}</p>
            </div>
            {activity.amount && <p className={`text-sm font-semibold ${color}`}>+${parseFloat(activity.amount).toFixed(2)}</p>}
        </li>
    );
};


const DashboardHomeContent = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const summaryData = await getDashboardSummaryData();
        setData(summaryData);
      } catch (err) {
        setError(err.message || "Could not load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-20">
        <span className="loading loading-lg loading-ball text-primary"></span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error shadow-lg"><div><FiAlertCircle/><span>Error: {error}</span></div></div>;
  }

  if (!data) {
    return <div className="text-center p-10">No dashboard data available.</div>;
  }

  // Combine recent sales and products and sort by time for a mixed activity feed
  const combinedActivity = [
      ...(data.recentSales || []),
      ...(data.recentProducts || [])
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5); // Show latest 5


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent mb-1">
          Welcome back, {user?.username || 'Seller'}!
        </h1>
        <p className="text-base-content/70">Here's your shop's pulse for today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Sales" value={data.totalSales} unit="$" icon={FiDollarSign} trend={`+${(data.totalSales * 0.05).toFixed(0)} this week`} color="bg-gradient-to-br from-green-500 to-emerald-600" textColor="text-white" trendColor="text-emerald-200"/>
        <StatCard title="Total Orders" value={data.totalOrders} icon={FiArchive} trend={`+${Math.floor(data.totalOrders * 0.1)} this week`} color="bg-gradient-to-br from-blue-500 to-sky-600" textColor="text-white" trendColor="text-sky-200"/>
        <StatCard title="Active Listings" value={data.activeListings} icon={FiPackage} color="bg-gradient-to-br from-amber-500 to-orange-600" textColor="text-white"/>
        <StatCard title="Upcoming Streams" value={data.upcomingStreamsCount} icon={FiFilm} color="bg-gradient-to-br from-purple-500 to-violet-600" textColor="text-white"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card bg-base-100 shadow-xl border border-base-300/40">
          <div className="card-body p-5">
            <div className="flex justify-between items-center mb-3">
                <h3 className="card-title text-lg font-semibold">Recent Activity</h3>
                <Link to="/dashboard/orders" className="btn btn-xs btn-ghost text-primary normal-case">View All Orders <FiArrowRight className="ml-1"/></Link>
            </div>
            {combinedActivity.length > 0 ? (
              <ul className="space-y-1">
                {combinedActivity.map(activity => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-base-content/70 italic py-4 text-center">No recent activity to show. Time to list or sell!</p>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl border border-base-300/40">
          <div className="card-body p-5">
            <h3 className="card-title text-lg font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2.5">
              <Link to="/dashboard/inventory/create" className="btn btn-primary btn-block justify-start normal-case text-left"><FiPlusSquare className="mr-2"/> Create New Product</Link>
              <Link to="/dashboard/streams/create" className="btn btn-secondary btn-block justify-start normal-case text-left"><FiTv className="mr-2"/> Schedule New Stream</Link>
              <Link to="/dashboard/inventory" className="btn btn-accent btn-outline btn-block justify-start normal-case text-left"><FiBox className="mr-2"/> Manage Inventory</Link>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-base-content mb-4 flex items-center gap-2"><FiBookOpen className="text-primary"/>Grow Your Shop</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <LearnCard title="Listing Like a Pro" description="Craft compelling product descriptions and take stunning photos." link="#" icon={FiBookOpen} />
          <LearnCard title="Engaging Live Streams" description="Host interactive streams that convert viewers into buyers." link="#" icon={FiPlayCircle} />
          <LearnCard title="Seller Policies & Fees" description="Understand the rules and fee structure for selling on Biddify." link="#" icon={FiHelpCircle} />
        </div>
      </div>
    </div>
  );
};

export default DashboardHomeContent;