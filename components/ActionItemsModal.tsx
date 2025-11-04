import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../firebase.config';
import { useAIFeature } from '../hooks/useAIFeature';
import { assignActionItem, extractActionItems, saveEditedActionItems } from '../services/aiService';
import { useAuthStore } from '../store/authStore';
import { commonModalStyles } from '../styles/commonModalStyles';
import type { ActionItem } from '../types';
import { Alerts } from '../utils/alerts';
import { getPriorityColor } from '../utils/colorHelpers';
import { Colors } from '../utils/colors';
import { formatDateString } from '../utils/dateFormat';
import { isWorkspaceAdmin } from '../utils/workspacePermissions';
import EditActionItemsModal from './EditActionItemsModal';
import { EmptyState } from './modals/EmptyState';
import { ErrorState } from './modals/ErrorState';
import { LoadingState } from './modals/LoadingState';
import { ModalHeader } from './modals/ModalHeader';

interface ActionItemsModalProps {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

interface Participant {
  uid: string;
  displayName: string;
}

export function ActionItemsModal({
  visible,
  conversationId,
  onClose,
}: ActionItemsModalProps) {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [itemToAssign, setItemToAssign] = useState<string | null>(null);
  const itemToAssignRef = useRef<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState<'saved' | 'fresh'>('saved');
  const [freshAiItems, setFreshAiItems] = useState<ActionItem[] | null>(null);
  
  const { data, loading, loadingSlowly, error, reload } = useAIFeature<any>({
    visible,
    conversationId,
    fetchFunction: extractActionItems,
  });

  // Update local state when data changes
  useEffect(() => {
    if (data && (data as any).items) {
      const fetchedItems = (data as any).items || [];
      // Sort by priority: high → medium → low
      const priorityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
      const sortedItems = [...fetchedItems].sort((a: ActionItem, b: ActionItem) => {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      setItems(sortedItems);
    }
  }, [data]);

  // Fetch conversation participants
  useEffect(() => {
    if (!visible || !conversationId) return;

    const fetchParticipants = async () => {
      try {
        const convRef = doc(db, 'conversations', conversationId);
        const convSnap = await getDoc(convRef);
        
        if (convSnap.exists()) {
          const convData = convSnap.data();
          
          // Get workspace ID
          const wsId = convData.workspaceId;
          setWorkspaceId(wsId);
          
          // Check if user is admin
          if (user?.uid && wsId) {
            const adminStatus = await isWorkspaceAdmin(user.uid, wsId);
            setIsAdmin(adminStatus);
          } else {
            setIsAdmin(false);
          }
          
          const participantDetails = convData.participantDetails || {};
          const participantsList: Participant[] = Object.entries(participantDetails).map(
            ([uid, data]: [string, any]) => ({
              uid,
              displayName: data.displayName || data.email || 'Unknown',
            })
          );
          setParticipants(participantsList);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      }
    };

    fetchParticipants();
  }, [visible, conversationId, user?.uid]);

  // PHASE 4: Uncomment toggle status when implementing workspaces
  // (Status toggling also creates persistent state that needs proper management)
  // const handleToggleStatus = async (itemId: string, currentStatus: string) => {
  //   const newStatus: 'pending' | 'completed' = currentStatus === 'pending' ? 'completed' : 'pending';

  //   // Optimistic update
  //   setItems((prev) =>
  //     prev.map((item) =>
  //       item.id === itemId ? {...item, status: newStatus} : item
  //     )
  //   );

  //   try {
  //     // 1. Update Firestore document
  //     await toggleActionItemStatus(conversationId, itemId, newStatus);
  //     
  //     // 2. Invalidate cache so next open fetches fresh data
  //     await invalidateActionItemsCache(conversationId);
  //   } catch (err: any) {
  //     console.error('Toggle status error:', err);
  //     // Revert on error
  //     const revertStatus: 'pending' | 'completed' = newStatus === 'completed' ? 'pending' : 'completed';
  //     setItems((prev) =>
  //       prev.map((item) =>
  //         item.id === itemId ? {...item, status: revertStatus} : item
  //       )
  //     );
  //   }
  // };

  // PHASE 4: Action Item Assignment (now enabled for workspace admins)
  const handleAssignPress = (itemId: string) => {
    setItemToAssign(itemId);
    itemToAssignRef.current = itemId;
    setShowAssignPicker(true);
  };

  const handleAssignToParticipant = async (participant: Participant, itemId: string) => {
    if (!itemId) {
      console.warn('[ActionItemsModal] No itemId provided');
      return;
    }

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, assigneeUid: participant.uid, assigneeDisplayName: participant.displayName }
          : item
      )
    );

    // Close the picker and clear the ref AFTER optimistic update
    setShowAssignPicker(false);
    setItemToAssign(null);
    itemToAssignRef.current = null;

    try {
      // 1. Update Firestore document via Cloud Function (also updates cache)
      await assignActionItem(conversationId, itemId, participant.uid, participant.displayName);
      
      // Note: Don't reload here - optimistic update already shows the change
      // The Cloud Function updates the cache, so next open will fetch fresh data
    } catch (err: any) {
      console.error('[ActionItemsModal] Assign error:', err);
      Alerts.error(err.message || 'Failed to assign task. Please try again.');
      // Revert on error
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, assigneeUid: null, assigneeDisplayName: null }
            : item
        )
      );
    }
  };

  const handleClose = () => {
    setItems([]);
    setParticipants([]);
    setShowAssignPicker(false);
    setItemToAssign(null);
    itemToAssignRef.current = null;
    setIsAdmin(false);
    setWorkspaceId(undefined);
    setShowEditModal(false);
    setViewMode('saved');
    setFreshAiItems(null);
    onClose();
  };

  const handleEditPress = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = async (editedItems: ActionItem[]) => {
    try {
      await saveEditedActionItems(conversationId, editedItems);
      setShowEditModal(false);
      Alerts.success('Action items saved successfully');
      reload(); // Reload to show saved version in main modal
    } catch (error: any) {
      throw error; // Let EditActionItemsModal handle it
    }
  };

  const handleGetFreshAI = async () => {
    try {
      const fresh = await extractActionItems(conversationId) as any;
      const freshItems = fresh.items || [];
      // Sort by priority
      const priorityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
      const sortedItems = [...freshItems].sort((a: ActionItem, b: ActionItem) => {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      setFreshAiItems(sortedItems);
      setViewMode('fresh');
    } catch (error: any) {
      Alerts.error(error.message || 'Failed to generate fresh action items');
    }
  };

  // Determine if user can edit
  const canEdit = workspaceId ? isAdmin : user?.isPaidUser;

  // Check if action items have been edited (any item has editedByAdmin flag)
  const hasSavedVersion = items.some((item: ActionItem) => item.editedByAdmin === true);

  // Display items based on view mode
  const displayedItems = viewMode === 'fresh' && freshAiItems ? freshAiItems : items;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={commonModalStyles.container}>
        <ModalHeader title="Action Items" onClose={handleClose} />

        {/* Loading State */}
        {loading && (
          <LoadingState
            message="Scanning for action items..."
            submessage={loadingSlowly ? "Still working on it, thanks for your patience..." : undefined}
          />
        )}

        {/* Error State */}
        {error && !loading && (
          <ErrorState error={error} onRetry={reload} />
        )}

        {/* Action Items List */}
        {!loading && !error && (
          <>
            {/* Edited Badge */}
            {hasSavedVersion && viewMode === 'saved' && displayedItems.length > 0 && (
              <View style={styles.editedBadge}>
                <Ionicons name="pencil" size={14} color={Colors.primary} />
                <Text style={styles.editedBadgeText}>
                  Edited by Admin
                </Text>
              </View>
            )}

            <FlatList
              data={displayedItems}
              keyExtractor={(item, index) => item.id || `item-${index}`}
            renderItem={({item}) => (
              <View
                style={[
                  styles.itemCard,
                  {borderLeftColor: getPriorityColor(item.priority)},
                ]}
              >
                <View style={styles.itemHeader}>
                  {/* PHASE 4: Uncomment checkbox when implementing status toggling
                  <TouchableOpacity
                    onPress={() => handleToggleStatus(item.id, item.status)}
                    style={styles.checkbox}
                  >
                    <Text style={styles.checkboxText}>
                      {item.status === 'completed' ? '✓' : ''}
                    </Text>
                  </TouchableOpacity>
                  */}
                  
                  {/* Phase 3: Read-only checkbox */}
                  <View style={styles.checkbox}>
                    <Text style={styles.checkboxText}>
                      {item.status === 'completed' ? '✓' : ''}
                    </Text>
                  </View>

                  <View style={styles.itemContent}>
                    <Text
                      style={[
                        styles.itemText,
                        item.status === 'completed' && styles.itemTextCompleted,
                      ]}
                    >
                      {item.text}
                    </Text>

                    {item.assigneeDisplayName ? (
                      <View style={styles.assigneeContainer}>
                        <Text style={styles.assigneeIcon}>👤</Text>
                        <Text style={styles.assigneeText}>
                          {item.assigneeDisplayName}
                        </Text>
                      </View>
                    ) : isAdmin && workspaceId ? (
                      <TouchableOpacity
                        onPress={() => handleAssignPress(item.id)}
                        style={styles.assignButton}
                      >
                        <Text style={styles.assignButtonText}>➕ Assign</Text>
                      </TouchableOpacity>
                    ) : null}

                    {item.dueDate && (
                      <View style={styles.dueDateContainer}>
                        <Text style={styles.dueDateIcon}>📅</Text>
                        <Text style={styles.dueDateText}>
                          Due: {formatDateString(item.dueDate)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.priorityBadge}>
                      <View
                        style={[
                          styles.priorityDot,
                          {backgroundColor: getPriorityColor(item.priority)},
                        ]}
                      />
                      <Text style={styles.priorityText}>
                        {item.priority.toUpperCase()} PRIORITY
                      </Text>
                    </View>

                    {/* Edit Button (only for saved items with editedByAdmin) */}
                    {canEdit && viewMode === 'saved' && item.editedByAdmin && (
                      <TouchableOpacity
                        style={styles.itemEditButton}
                        onPress={handleEditPress}
                      >
                        <Ionicons name="pencil" size={14} color={Colors.primary} />
                        <Text style={styles.itemEditButtonText}>Re-edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              !loading && !error ? (
                <EmptyState
                  icon="✓"
                  message="No action items found"
                  submessage="AI didn't detect any tasks or to-dos in this conversation"
                />
              ) : null
            }
            contentContainerStyle={[
              styles.listContent,
              displayedItems.length === 0 && styles.listContentEmpty,
            ]}
          />

          {/* Edit & Save Buttons */}
          {canEdit && displayedItems.length > 0 && (
            <View style={styles.actionButtons}>
              {!hasSavedVersion && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditPress}
                >
                  <Ionicons name="pencil-outline" size={18} color="#fff" />
                  <Text style={styles.editButtonText}>Edit & Save</Text>
                </TouchableOpacity>
              )}

              {hasSavedVersion && viewMode === 'saved' && (
                <TouchableOpacity
                  style={styles.freshButton}
                  onPress={handleGetFreshAI}
                >
                  <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                  <Text style={styles.freshButtonText}>Get Fresh AI Analysis</Text>
                </TouchableOpacity>
              )}

              {viewMode === 'fresh' && (
                <TouchableOpacity
                  style={styles.freshButton}
                  onPress={() => setViewMode('saved')}
                >
                  <Ionicons name="bookmark-outline" size={18} color={Colors.primary} />
                  <Text style={styles.freshButtonText}>View Your Saved Version</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          </>
        )}

        {/* Assignment Picker Modal */}
        <Modal
          visible={showAssignPicker}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowAssignPicker(false);
            setItemToAssign(null);
            itemToAssignRef.current = null;
          }}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowAssignPicker(false);
              setItemToAssign(null);
              itemToAssignRef.current = null;
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => {
                // Stop propagation to prevent closing modal when clicking inside
                e.stopPropagation();
              }}
            >
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>Assign to:</Text>
                {participants.map((participant) => (
                  <TouchableOpacity
                    key={participant.uid}
                    style={styles.pickerItem}
                    onPress={() => {
                      const currentItemId = itemToAssignRef.current;
                      if (currentItemId) {
                        handleAssignToParticipant(participant, currentItemId);
                      }
                    }}
                  >
                    <Text style={styles.pickerItemText}>
                      👤 {participant.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.pickerCancelButton}
                  onPress={() => {
                    setShowAssignPicker(false);
                    setItemToAssign(null);
                    itemToAssignRef.current = null;
                  }}
                >
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Edit Action Items Modal */}
        <EditActionItemsModal
          visible={showEditModal}
          actionItems={items}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  itemHeader: {
    flexDirection: 'row',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: 8,
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textLight,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assigneeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  assigneeText: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dueDateIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  dueDateText: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
  },
  assignButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  assignButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 16,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
    marginBottom: 8,
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.textDark,
  },
  pickerCancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerCancelText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  editedBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#fff',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  freshButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 6,
  },
  freshButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  itemEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  itemEditButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
