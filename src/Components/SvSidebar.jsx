import { useEffect, useState } from "react";
import profileBackground2_small from "../assets/profileBackground2_small.png";

const SvSidebar = ({ serverData, setActiveChannel }) => {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveStateChannel] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [channelOptions, setChannelOptions] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [newChannelName, setNewChannelName] = useState("");

  useEffect(() => {
    if (serverData?.Rooms) {
      // Rooms içeriğini id, name, type, position formatına normalize et
      const loadedChannels = serverData.Rooms.map((room) => ({
        id: room.RoomID,
        name: room.RoomName,
        type: room.Type === "TextRoom" ? "text" : "voice",
        position: room.Position ?? 0,
      }));

      // Position değerine göre sırala
      const sorted = loadedChannels.sort((a, b) => a.position - b.position);
      setChannels(sorted);
    }
  }, [serverData]);

  const addChannel = (type) => {
    const newChannel = {
      id: Date.now().toString(),
      name:
        type === "voice"
          ? `Voice Channel #${channels.filter((c) => c.type === "voice").length + 1}`
          : `Text Channel #${channels.filter((c) => c.type === "text").length + 1}`,
      type,
      position: channels.length + 1,
    };

    setChannels([...channels, newChannel]);
    setShowDropdown(false);
  };

  const handleChannelClick = (channel) => {
    setActiveChannel && setActiveChannel(channel);
    setActiveStateChannel(channel);
  };

  const renameChannel = (id) => {
    setChannels(
      channels.map((channel) =>
        channel.id === id ? { ...channel, name: newChannelName || channel.name } : channel
      )
    );
    setEditingChannel(null);
    setNewChannelName("");
  };

  const deleteChannel = (id) => {
    if (activeChannel?.id === id) {
      setActiveChannel && setActiveChannel(null);
      setActiveStateChannel(null);
    }
    setChannels(channels.filter((channel) => channel.id !== id));
    setChannelOptions(null);
  };

  return (
    <div className="relative h-screen">
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-screen w-64 bg-[#222831] text-white shadow-lg flex flex-col justify-between">
        <div>
          <div
            className="relative bg-cover bg-center h-32 w-full"
            style={{ backgroundImage: `url(${profileBackground2_small})` }}
          >
            <div className="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center">
              <h1 className="text-white font-bold text-xl">
                {serverData?.ServerName || "Loading..."}
              </h1>
            </div>
          </div>

          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full bg-[#222831] text-white border-2 border-[#393E46] p-2 text-sm"
          >
            + Add Channel
          </button>

          {showDropdown && (
            <div className="bg-[#222831] text-white p-2">
              <button
                onClick={() => addChannel("voice")}
                className="w-full text-left p-1 text-sm hover:bg-[#393E46]"
              >
                Voice Channel
              </button>
              <button
                onClick={() => addChannel("text")}
                className="w-full text-left p-1 text-sm hover:bg-[#393E46]"
              >
                Text Channel
              </button>
            </div>
          )}

          <h2 className="text-md font-bold p-2">Channels</h2>
          <div className="border-t border-[#393E46] mb-2" />

          <ul className="flex flex-col">
            {channels.map((channel) => (
              <li
                key={channel.id}
                className={`relative w-full p-1 text-sm cursor-pointer flex justify-between items-center ${
                  channel === activeChannel
                    ? "bg-[#393E46] text-[#FFD369]"
                    : "bg-transparent text-white"
                } transition-all duration-200`}
                onClick={() => handleChannelClick(channel)}
              >
                {editingChannel === channel.id ? (
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    onBlur={() => renameChannel(channel.id)}
                    onKeyDown={(e) => e.key === "Enter" && renameChannel(channel.id)}
                    className="bg-transparent border-b border-[#FFD369] outline-none text-white"
                    autoFocus
                  />
                ) : (
                  <span>{channel.name}</span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setChannelOptions(channelOptions === channel.id ? null : channel.id);
                  }}
                  className="text-white px-1 py-0.5 text-xs"
                >
                  ...
                </button>

                {channelOptions === channel.id && (
                  <div className="absolute right-0 top-full mt-1 bg-[#222831] text-white text-sm border border-[#393E46] p-1 shadow-lg z-10">
                    <button
                      onClick={() => {
                        setEditingChannel(channel.id);
                        setNewChannelName(channel.name);
                        setChannelOptions(null);
                      }}
                      className="block w-full text-left p-1 hover:bg-[#393E46]"
                    >
                      Rename Channel
                    </button>
                    <button
                      onClick={() => deleteChannel(channel.id)}
                      className="block w-full text-left p-1 hover:bg-[#393E46] text-red-400"
                    >
                      Delete Channel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {activeChannel?.type === "voice" && (
          <div className="flex justify-around items-center p-2 border-t border-[#393E46]">
            <button className="p-2 border-2 border-[#393E46] rounded">🔊</button>
            <button className="p-2 border-2 border-[#393E46] rounded">🎤</button>
            <button className="p-2 border-2 border-[#393E46] rounded">🎥</button>
            <button className="p-2 border-2 border-[#393E46] rounded">🖥️</button>
          </div>
        )}
      </div>

      {activeChannel && (
        <div
          className="fixed left-0 top-0 h-screen w-full bg-[#393E46] text-white z-50 p-4"
          style={{ width: "calc(100vw - 256px)" }}
        >
          <h2 className="text-2xl font-bold">{activeChannel.name}</h2>
          <p>Type: {activeChannel.type}</p>
          <p>Content of the channel will go here...</p>
        </div>
      )}
    </div>
  );
};

export default SvSidebar;
