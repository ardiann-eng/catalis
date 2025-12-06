import React from 'react';

const StatCard = ({ title, value, icon, change, changeType, loading }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <div className="p-2 bg-gray-100 rounded-lg">
              {icon}
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="mt-2 flex items-center">
              <span className={`text-sm font-medium ${
                changeType === 'increase' 
                  ? 'text-green-600' 
                  : changeType === 'decrease' 
                    ? 'text-red-600' 
                    : 'text-gray-500'
              }`}>
                {change}
              </span>
              <span className="text-sm text-gray-500 ml-1">dari periode sebelumnya</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatCard;