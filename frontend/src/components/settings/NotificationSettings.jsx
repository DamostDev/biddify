import React from 'react';
import { FiBell, FiMail, FiSmartphone } from 'react-icons/fi';

const NotificationSettings = () => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-base-content flex items-center gap-2">
        <FiBell /> Notification Preferences
      </h2>
      <p className="text-base-content/70">
        Manage how you receive updates from Biddify. These settings are illustrative and not yet functional.
      </p>

      <div className="card bg-base-200/60 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg flex items-center gap-2"><FiMail /> Email Notifications</h3>
          <div className="form-control">
            <label className="label cursor-pointer justify-between">
              <span className="label-text">New bids on your items</span>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-between">
              <span className="label-text">Weekly Newsletter</span>
              <input type="checkbox" className="toggle toggle-primary" />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-between">
              <span className="label-text">Promotional offers</span>
              <input type="checkbox" className="toggle toggle-primary" />
            </label>
          </div>
        </div>
      </div>

      <div className="card bg-base-200/60 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg flex items-center gap-2"><FiSmartphone /> Push Notifications</h3>
          <div className="form-control">
            <label className="label cursor-pointer justify-between">
              <span className="label-text">Live shows you follow go live</span>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-between">
              <span className="label-text">Someone you follow lists a new item</span>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked/>
            </label>
          </div>
        </div>
      </div>

      <div className="form-control pt-4">
        <button className="btn btn-primary btn-md" disabled>Save Notification Preferences</button>
        <p className="text-xs text-base-content/60 mt-1 text-center">Notification settings are coming soon!</p>
      </div>
    </div>
  );
};

export default NotificationSettings;