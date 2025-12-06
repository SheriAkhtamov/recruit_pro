import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { devLog } from '@/lib/debug';

interface WebSocketMessage {
  type:
  | 'candidate_update'
  | 'vacancy_update'
  | 'interview_update'
  | 'notification'
  | 'user_status'
  | 'VACANCY_CREATED'
  | 'VACANCY_UPDATED'
  | 'CANDIDATE_CREATED'
  | 'CANDIDATE_UPDATED'
  | 'CANDIDATE_DELETED'
  | 'DOCUMENTATION_CANDIDATE_CREATED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_STAGE_UPDATED'
  | 'INTERVIEW_STAGE_COMMENTS_UPDATED'
  | 'NEW_MESSAGE'
  | 'MESSAGE_READ'
  | 'USER_STATUS_CHANGED';
  data: Record<string, unknown>;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Don't connect WebSocket for super admin in view mode
    if ((user as any).isSuperAdminView) {
      devLog('👁 Skipping WebSocket connection for super admin view mode');
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      // Send user connection message to track online status
      if (ws.current && user) {
        ws.current.send(JSON.stringify({
          type: 'USER_CONNECT',
          userId: user.id
        }));
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      // Only log WebSocket errors in development
      if (import.meta.env.DEV) {
        devLog('WebSocket connection failed - this is expected in development mode', error);
      }
      setIsConnected(false);
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        devLog('Failed to parse WebSocket message:', error);
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user]);

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'VACANCY_CREATED':
      case 'VACANCY_UPDATED':
        queryClient.invalidateQueries({ queryKey: ['/api/vacancies'] });
        break;
      case 'CANDIDATE_CREATED':
      case 'CANDIDATE_UPDATED':
        queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
        break;
      case 'DOCUMENTATION_CANDIDATE_CREATED':
        // Specifically handle documentation candidates
        queryClient.invalidateQueries({ queryKey: ['documentation-candidates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
        break;
      case 'CANDIDATE_DELETED':
        // Invalidate all candidate-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/candidates/archived'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
        break;
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_STAGE_UPDATED':
        queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
        queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
        break;
      case 'INTERVIEW_STAGE_COMMENTS_UPDATED':
        // Invalidate interview stages for the specific candidate
        if (message.data?.candidateId) {
          queryClient.invalidateQueries({
            queryKey: ['/api/interview-stages/candidate', message.data.candidateId]
          });
        }
        // Also invalidate general candidates queries to refresh cards
        queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
        break;
      case 'NEW_MESSAGE':
        // Invalidate messages for the specific conversation
        if (message.data?.senderId && message.data?.receiverId) {
          queryClient.invalidateQueries({ queryKey: ['/api/messages', message.data.senderId] });
          queryClient.invalidateQueries({ queryKey: ['/api/messages', message.data.receiverId] });
          queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
        }
        break;
      case 'USER_STATUS_CHANGED':
        // Invalidate online status queries
        queryClient.invalidateQueries({ queryKey: ['/api/users/online-status'] });
        break;
      default:
        devLog('Unhandled WebSocket message type:', message.type);
    }
  };

  return { isConnected };
}
