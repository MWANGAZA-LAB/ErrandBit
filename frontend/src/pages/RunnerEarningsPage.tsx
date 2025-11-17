/**
 * Runner Earnings Dashboard
 * 
 * Comprehensive earnings view for runners with:
 * - Earnings summary (total, pending, completed)
 * - Time period breakdowns (daily, weekly, monthly)
 * - Payout history with Lightning payment details
 * - Retry failed payouts
 * - Visual charts for earnings trends
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../api';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Award
} from 'lucide-react';

interface EarningsSummary {
  totalPayouts: number;
  totalEarnedCents: number;
  totalEarnedSats: number;
  pendingCents: number;
}

interface PayoutHistoryItem {
  id: number;
  jobId: number;
  jobTitle: string;
  amountCents: number;
  amountSats: number;
  platformFeeCents: number;
  netAmountCents: number;
  netAmountSats: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutMethod: string;
  lightningAddress: string | null;
  paymentHash: string | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

type TimePeriod = 'all' | 'today' | 'week' | 'month';

export default function RunnerEarningsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch earnings summary
  const { data: summary, isLoading: summaryLoading } = useQuery<EarningsSummary>({
    queryKey: ['earnings', 'summary'],
    queryFn: async () => {
      const response = await api.get('/earnings/summary');
      return response.data.data;
    },
  });

  // Fetch payout history
  const { data: history, isLoading: historyLoading } = useQuery<PayoutHistoryItem[]>({
    queryKey: ['earnings', 'history'],
    queryFn: async () => {
      const response = await api.get('/earnings/history?limit=100');
      return response.data.data;
    },
  });

  // Retry payout mutation
  const retryPayoutMutation = useMutation({
    mutationFn: async (earningId: number) => {
      const response = await api.post(`/earnings/${earningId}/retry`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      toast.success('Payout retry initiated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to retry payout');
    },
  });

  // Filter history by time period
  const filteredHistory = history?.filter((item: PayoutHistoryItem) => {
    if (selectedPeriod === 'all') return true;
    
    const itemDate = new Date(item.createdAt);
    const now = new Date();
    
    if (selectedPeriod === 'today') {
      return itemDate.toDateString() === now.toDateString();
    } else if (selectedPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= weekAgo;
    } else if (selectedPeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return itemDate >= monthAgo;
    }
    return true;
  }) || [];

  // Calculate period stats
  const periodStats = filteredHistory.reduce(
    (acc: { earned: number; earnedSats: number; pending: number; completed: number; failed: number }, item: PayoutHistoryItem) => {
      if (item.status === 'completed') {
        acc.earned += item.netAmountCents;
        acc.earnedSats += item.netAmountSats;
        acc.completed++;
      } else if (item.status === 'pending') {
        acc.pending += item.netAmountCents;
      } else if (item.status === 'failed') {
        acc.failed++;
      }
      return acc;
    },
    { earned: 0, earnedSats: 0, pending: 0, completed: 0, failed: 0 }
  );

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`;
      case 'processing':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`;
      default:
        return baseClasses;
    }
  };

  if (summaryLoading || historyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading earnings data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Earnings Dashboard
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Track your earnings and payout history
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Earned */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
              Total Earned
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary?.totalEarnedCents || 0)}
            </p>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
              <Zap className="w-3 h-3 mr-1" />
              {(summary?.totalEarnedSats || 0).toLocaleString()} sats
            </div>
          </div>

          {/* Pending Payouts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
              Pending
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary?.pendingCents || 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Awaiting processing
            </p>
          </div>

          {/* Total Payouts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
              Total Payouts
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary?.totalPayouts || 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Completed jobs
            </p>
          </div>

          {/* Lightning */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
              Lightning Network
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              Instant
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Fast payouts
            </p>
          </div>
        </div>

        {/* Time Period Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
              Period:
            </span>
            {(['all', 'today', 'week', 'month'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {/* Period Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Earned</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(periodStats.earned)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {periodStats.completed}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(periodStats.pending)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {periodStats.failed}
              </p>
            </div>
          </div>
        </div>

        {/* Payout History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Payout History
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filteredHistory.length} transactions
            </p>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No payouts yet. Complete jobs to start earning!
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Job
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Net
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredHistory.map((item: PayoutHistoryItem) => (
                    <>
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => setShowDetails(showDetails === item.id ? null : item.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {format(new Date(item.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="font-medium">{item.jobTitle}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Job #{item.jobId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.amountCents)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.platformFeeCents)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          <div>{formatCurrency(item.netAmountCents)}</div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Zap className="w-3 h-3 mr-1" />
                            {item.netAmountSats.toLocaleString()} sats
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <span className={getStatusBadge(item.status)}>
                              {item.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.status === 'failed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                retryPayoutMutation.mutate(item.id);
                              }}
                              disabled={retryPayoutMutation.isPending}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                      {showDetails === item.id && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
                            <div className="space-y-2 text-sm">
                              {item.lightningAddress && (
                                <div className="flex items-start gap-2">
                                  <Zap className="w-4 h-4 text-yellow-500 mt-0.5" />
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                      Lightning Address:
                                    </span>
                                    <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                      {item.lightningAddress}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {item.paymentHash && (
                                <div className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                      Payment Hash:
                                    </span>
                                    <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                      {item.paymentHash}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {item.completedAt && (
                                <div className="flex items-start gap-2">
                                  <Clock className="w-4 h-4 text-blue-500 mt-0.5" />
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                      Completed:
                                    </span>
                                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                                      {format(new Date(item.completedAt), 'MMM d, yyyy HH:mm:ss')}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {item.errorMessage && (
                                <div className="flex items-start gap-2">
                                  <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                      Error:
                                    </span>
                                    <span className="ml-2 text-red-600 dark:text-red-400">
                                      {item.errorMessage}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
