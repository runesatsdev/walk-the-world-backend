// API service for backend communication
import axios from 'axios';
import type { TaskData, FeedbackResponse, ClaimResponse, AdminReportRequest, AdminReportResponse, SpaceTrackingRequest, SpaceTrackingResponse } from './types';

const API_BASE_URL = 'http://localhost:5000/api/v1/extension';


// API Functions

export const fetchNextTask = async (accessToken: string): Promise<TaskData | null> => {
  try {
    const response = await axios({
      method: 'get',
      url: `${API_BASE_URL}/tasks/next`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching next task:', error);
    return null;
  }
};

export const submitFeedback = async (
  accessToken: string,
  taskId: string,
  ratings: {
    signalStrength: number;
    authenticity: number;
    sentiment: string;
  },
  comment: string = ''
): Promise<FeedbackResponse | null> => {
  try {
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}/feedback`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      data: {
        taskId,
        ratings,
        comment
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return null;
  }
};

export const claimReward = async (accessToken: string, rewardId: string): Promise<ClaimResponse | null> => {
  try {
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}/rewards/claim`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      data: {
        rewardId
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error claiming reward:', error);
    return null;
  }
};

export const submitAdminReport = async (accessToken: string, reportData: AdminReportRequest): Promise<AdminReportResponse | null> => {
  try {
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}/reports`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      data: reportData,
    });

    return response.data;
  } catch (error) {
    console.error('Error submitting admin report:', error);
    return null;
  }
};

export const submitSpaceTracking = async (accessToken: string, spaceData: SpaceTrackingRequest): Promise<SpaceTrackingResponse | null> => {
  try {
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}/spaces/submit`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      data: spaceData,
    });

    return response.data;
  } catch (error) {
    console.error('Error submitting space tracking:', error);
    return null;
  }
};

