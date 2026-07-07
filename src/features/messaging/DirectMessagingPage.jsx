import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getGroupById } from "../../services/groupService";
import { getUser } from "../../services/userService";
import ChatPanel from "../../components/chat/ChatPanel";

async function fetchFriendData(userID) {
  try {
    const user = await getUser(userID);
    if (user) {
      return {
        userID: user.userID,
        nickName: user.nickName,
        photoURL: user.photoURL || "/1.png"
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching friend data:", error);
    return null;
  }
}

const DirectMessagingPage = () => {
  const location = useLocation();
  const selectedUserID = location.state?.userID;

  const { userData } = useAuth();
  const [groupList, setGroupList] = useState([]);
  const [groupDataList, setGroupDataList] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [allFriendsData, setAllFriendsData] = useState({});

  useEffect(() => {
    if (userData && userData.groups) {
      setGroupList(userData.groups);
    }
  }, [userData]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (Array.isArray(groupList) && groupList.length > 0) {
        const groupsData = [];
        for (const groupID of groupList) {
          const group = await getGroupById(groupID);
          if (group) groupsData.push({ id: groupID, group });
        }
        setGroupDataList(groupsData);
      } else {
        setGroupDataList([]);
      }
    };
    fetchGroups();
  }, [groupList]);

  useEffect(() => {
    if (selectedUserID && groupDataList.length > 0) {
      const found = groupDataList.find(
        (g) => g.group.users && g.group.users.includes(selectedUserID)
      );
      if (found) {
        setSelectedGroup({ id: found.id, ...found.group });
      }
    }
  }, [selectedUserID, groupDataList]);

  useEffect(() => {
    const fetchAllFriends = async () => {
      if (groupDataList.length > 0) {
        const userIDs = [
          ...new Set(
            groupDataList.flatMap(g => g.group.users || [])
              .filter(id => id !== userData?.userID)
          )
        ];
        const friendDataArr = await Promise.all(userIDs.map(id => fetchFriendData(id)));
        const friendDataObj = {};
        friendDataArr.forEach(fd => {
          if (fd) friendDataObj[fd.userID] = fd;
        });
        setAllFriendsData(friendDataObj);
      }
    };
    fetchAllFriends();
  }, [groupDataList, userData]);

  const handleGroupSelect = (groupWithId) => {
    setSelectedGroup(groupWithId);
  };

  const getChatHeaderIcon = () => {
    if (!selectedGroup || !userData) return null;
    const otherUserId = (selectedGroup.users || []).find(id => id !== userData.userID);
    const otherUser = allFriendsData[otherUserId];
    return (
      <img
        src={otherUser?.photoURL || "/1.png"}
        alt="Avatar"
        className="w-8 h-8 rounded-full border border-[var(--primary-border)]"
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.1 }}
      className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)]"
    >
      <div className="background fixed inset-0 flex items-center justify-center min-h-screen bg-[var(--primary-bg)] z-0">
        <div className="w-full my-auto max-w-5xl h-[90vh] flex bg-[var(--primary-bg)] rounded-xl shadow-lg overflow-hidden border border-[var(--primary-border)]">
          {/* Sol Sidebar - Grup Listesi */}
          <div className="w-80 bg-[var(--primary-bg)] border-r border-[var(--primary-border)] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[var(--primary-border)]">
              <h2 className="text-xl font-semibold text-[var(--primary-text)] flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Mesajlar
              </h2>
            </div>

            {/* Grup Listesi */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence>
                {groupDataList.map((groupEntry, index) => {
                  const otherUserId = (groupEntry.group.users || []).find(id => id !== userData?.userID);
                  const otherUser = allFriendsData[otherUserId];
                  const isSelected = selectedGroup?.id === groupEntry.id;
                  return (
                    <motion.div
                      key={`${groupEntry.id}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`p-4 border-b border-[var(--primary-border)] cursor-pointer transition-colors hover:bg-[var(--secondary-bg)] ${
                        isSelected ? 'bg-[var(--secondary-bg)] border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => handleGroupSelect({ id: groupEntry.id, ...groupEntry.group })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <img
                              src={otherUser?.photoURL || "/1.png"}
                              alt="Avatar"
                              className="w-8 h-8 rounded-full"
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-[var(--primary-text)]">{groupEntry.group.groupName}</h3>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Ana Mesajlaşma Alanı */}
          <div className="flex-1 flex flex-col">
            {selectedGroup ? (
              <ChatPanel
                context={{ groupId: selectedGroup.id }}
                channelName={selectedGroup.groupName}
                headerIcon={getChatHeaderIcon()}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[var(--secondary-bg)]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[var(--primary-bg)] border border-[var(--primary-border)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-[var(--secondary-text)]" />
                  </div>
                  <h3 className="text-lg font-medium text-[var(--primary-text)] mb-2">Mesajlaşmaya Başla</h3>
                  <p className="text-[var(--secondary-text)]">Konuşmaya başlamak için sol taraftan bir grup seçin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DirectMessagingPage;
