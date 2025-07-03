"use client"

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Clock, Heart, MessageCircle, Plus, Send } from "lucide-react";
import { useEffect, useState } from "react"
import { WalletButton } from "../solana/solana-provider";
import { useSocialProgram } from "../social/social-data-access";
import { ThemeSelect } from "../theme-select";
import Image from "next/image";
import BN from "bn.js";

interface PostType {
    authority: PublicKey;
    content: string;
    likes: BN;
    commentCount: BN;
    postId: BN;
    createdAt: BN;
}

interface LikeType {
    authority: PublicKey;
    content: string;
    likes: BN;
    commentCount: BN;
    postId: BN;
    createdAt: BN;
}

// interface CommentType {
//     content: string;
//     author: string;
//     createdAt: number;
// }

interface UserType {
    authority: PublicKey;
    username: string;
    postCount: BN;
    followers: number;
    following: number;
    bio: string;
    profilePicture: string;
    createdAt: BN;
    updatedAt: BN;
    isVerified: boolean;
    isPrivate: boolean;
    isActive: boolean;
    bump: number;
}

export default function SocialMedia() {
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [profilePic, setProfilePic] = useState("");
    const [newPostContent, setNewPostContent] = useState("");
    const [newComment, setNewComment] = useState<string>("");
    const [sessionStatus, setSessionStatus] = useState({
        active: false,
        expires: new Date(),
        // keypairBalance: 0,
    });
    const [sessionBalance, setSessionBalance] = useState(0);
    // const [refundStatus, setRefundStatus] = useState({
    //     canRefund: false,
    //     // refundAmount: 0,
    //     timeUntilRefund: 0
    // });
    // const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
    // const [showSettings, setShowSettings] = useState(false);
    // const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
    // const [filterByUser, setFilterByUser] = useState<string>('all');
    
    // const [pendingActions, setPendingActions] = useState<any[]>([]);
    const { connected, publicKey } = useWallet();
    const { connection } = useConnection();
    const [sessionKeypair, setSessionKeypair] = useState<Keypair | null>(null);
    const { 
        initializeSession, 
        initializeUser, 
        postAccounts, 
        userAccounts, 
        sessionAccounts,
        comment, 
        post, 
        like, 
        refundSession, 
        fundSession,
        // sessionKeypair
    } = useSocialProgram();
    // const { theme, setTheme } = useTheme();
    // const [activeTab, setActiveTab] = useState<"feed" | "profile">("feed");
    const [userExist, setUserExist] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [showUserForm, setShowUserForm] = useState(false);

    // Helper function to format time elegantly
    // const formatTime = (timestamp: number): string => {
    //     const now = Date.now();
    //     const diff = now - timestamp;
    //     const minutes = Math.floor(diff / 60000);
    //     const hours = Math.floor(diff / 3600000);
    //     const days = Math.floor(diff / 86400000);

    //     if (minutes < 1) return 'just now';
    //     if (minutes < 60) return `${minutes}m`;
    //     if (hours < 24) return `${hours}h`;
    //     if (days < 7) return `${days}d`;
    //     return new Date(timestamp).toLocaleDateString();
    // };

    // Helper function to validate image URL
    const isValidImageUrl = (url: string): boolean => {
        const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i;
        return urlPattern.test(url);
    };

    // Helper function to generate avatar
    const generateAvatar = (seed: string): string => {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
    };

     // Helper function to truncate text
    // const truncateText = (text: string, maxLength: number): string => {
    //     if (text.length <= maxLength) return text;
    //     return text.substring(0, maxLength) + '...';
    // };

    // Helper function to get user stats
    // const getUserStats = (authority: PublicKey) => {
    //     const userPosts = postAccounts.data?.filter(post => 
    //         post.account.authority.equals(authority)
    //     ) || [];
        
    //     const totalLikes = userPosts.reduce((sum, post) => 
    //         sum + post.account.likes.toNumber(), 0
    //     );
        
    //     const totalComments = userPosts.reduce((sum, post) => 
    //         sum + post.account.commentCount.toNumber(), 0
    //     );

    //     return {
    //         postCount: userPosts.length,
    //         totalLikes,
    //         totalComments
    //     };
    // };

    // Helper function to sort posts
    // const sortPosts = (posts: PostType[]) => {
    //     return [...posts].sort((a, b) => {
    //         if (sortBy === 'newest') {
    //             return b.createdAt.toNumber() - a.createdAt.toNumber();
    //         } else {
    //             return b.likes.toNumber() - a.likes.toNumber();
    //         }
    //     });
    // };

    // Helper function to filter posts
    // const filterPosts = (posts: PostType[]) => {
    //     if (filterByUser === 'all') return posts;
    //     if (filterByUser === 'mine' && publicKey) {
    //         return posts.filter(post => post.authority.equals(publicKey));
    //     }
    //     return posts;
    // };

    // Check if user exists and get current user data
    useEffect(() => {
        if (publicKey && userAccounts.data) {
            const existingUser = userAccounts.data.find(user => 
                user.account.authority.equals(publicKey)
            );
            
            if (existingUser) {
                setUserExist(true);
                setCurrentUser(existingUser.account);
                setUsername(existingUser.account.username);
                setBio(existingUser.account.bio);
                setProfilePic(existingUser.account.profilePicture);
            } else {
                setUserExist(false);
                setCurrentUser(null);
            }
        }
    }, [publicKey, userAccounts.data]);

    // Check session status
    useEffect(() => {
        if (publicKey && sessionKeypair && sessionAccounts.data) {
            const activeSession = sessionAccounts.data.find(session => 
                session.account.authority.equals(publicKey) && 
                session.account.sessionKey.equals(sessionKeypair.publicKey)
            );
            
            if (activeSession) {
                const expiresAt = new Date(activeSession.account.expiredAt.toNumber() * 1000);
                const now = new Date();
                const isActive = expiresAt > now;
                // const timeUntilExpiry = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000));
                
                setSessionStatus({
                    active: isActive,
                    expires: expiresAt,
                    // keypairBalance: activeSession.account.balance.toNumber() / 1e9 // Convert lamports to SOL
                });

                // Set refund status based on session
                // if (isActive && timeUntilExpiry <= 10) { // 10 minutes before expiry
                    // setRefundStatus({
                        // canRefund: true,
                        // refundAmount: activeSession.account.balance.toNumber() / 1e9,
                        // timeUntilRefund: timeUntilExpiry
                    // });
                // } else if (!isActive) {
                    // setRefundStatus({
                        // canRefund: true,
                        // refundAmount: activeSession.account.balance.toNumber() / 1e9,
                        // timeUntilRefund: 0
                    // });
                // }
            }
        }
    }, [publicKey, sessionKeypair, sessionAccounts.data]);

    useEffect(() => {
        const getBalance = async () => {
            if (publicKey && sessionKeypair) {
                const balance = await connection.getBalance(sessionKeypair.publicKey);
                setSessionBalance(balance);
            }
        }
        getBalance();
    }, [publicKey, sessionKeypair, post, like, comment, refundSession, fundSession, connection]);

    // Helper function to get user data by authority
    const getUserByAuthority = (authority: PublicKey) => {
        return userAccounts.data?.find(user => 
            user.account.authority.equals(authority)
        )?.account;
    };

    // Create session
    const createSession = async () => {
        if (publicKey) {
            try {
                await initializeSession.mutateAsync({
                    authority: publicKey,
                    onSessionCreated: (keypair) => {
                        setSessionKeypair(keypair);
                        // In a real app, you'd want to store this securely
                        // localStorage.setItem('sessionKeypair', JSON.stringify(Array.from(keypair.secretKey)));
                        const sessionData = {
                            secretKey: Array.from(keypair.secretKey),
                            publicKey: keypair.publicKey.toString(),
                            createdAt: Date.now()
                        };
                        sessionStorage.setItem(`session_${publicKey.toString()}`, JSON.stringify(sessionData));
                    }
                });
            } catch (error) {
                console.error('Failed to create session:', error);
            }
        }
    };

    // Create user
    const createUser = async () => {
        if (publicKey && username.trim() && bio.trim()) {

            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(username.trim())) {
                alert('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
                return;
            }

            // Check if username already exists
            const existingUsername = userAccounts.data?.find(user => 
                user.account.username.toLowerCase() === username.trim().toLowerCase()
            );
            if (existingUsername) {
                alert('Username already exists. Please choose a different one.');
                return;
            }

            const finalProfilePic = profilePic.trim() && isValidImageUrl(profilePic.trim()) 
                ? profilePic.trim() 
                : generateAvatar(username.trim());

            try {
                await initializeUser.mutateAsync({ 
                    username: username.trim(), 
                    bio: bio.trim(), 
                    picture: finalProfilePic, 
                    authority: publicKey 
                });
                setShowUserForm(false);
            } catch (error) {
                console.error('Failed to create user:', error);
            }
        }
    };

    // Handle manual refund
    const handleRefund = async () => {
        if (publicKey && sessionKeypair) {

            // const confirmRefund = window.confirm(
            //     `Are you sure you want to refund ${refundStatus.refundAmount.toFixed(4)} SOL?`
            // );
            
            // if (!confirmRefund) return;
    
            try {
                await refundSession.mutateAsync({
                    authority: publicKey,
                    sessionKeypair: sessionKeypair.publicKey
                });
                // setSessionKeypair(null);
                // localStorage.removeItem('sessionKeypair');
                sessionStorage.removeItem(`session_${publicKey.toString()}`);
            } catch (error) {
                console.error('Failed to refund session:', error);
            }
        }
    };

    // Fund session
    const handleFundSession = async (amount: number) => {
        if (publicKey && sessionKeypair) {
            try {
                await fundSession.mutateAsync({
                    authority: publicKey,
                    sessionKeypair: sessionKeypair.publicKey,
                    amount: amount * 1e9 // Convert SOL to lamports
                });
            } catch (error) {
                console.error('Failed to fund session:', error);
            }
        }
    };

    // Handle like action
    const handleLike = async (postData: LikeType) => {
        if (publicKey && sessionStatus.active) {
            try {
                await like.mutateAsync({
                    postCount: postData.postId.toNumber(),
                    authority: publicKey,
                    postAuthority: postData.authority,
                    sessionKeypair: sessionKeypair!
                });
            } catch (error) {
                console.error('Failed to like post:', error);
            }
        }
    };

    // Handle comment
    const handleComment = async (postData: PostType) => {
        // const commentContent = newComment[postData.postId.toNumber()].content;
        if (publicKey && sessionStatus.active && newComment?.trim()) {
            try {
                await comment.mutateAsync({
                    content: newComment,
                    authority: publicKey,
                    postAuthority: postData.authority,
                    postCount: postData.postId.toNumber(),
                    sessionKeypair: sessionKeypair!
                });
                
                // Clear comment input
                setNewComment("");
            } catch (error) {
                console.error('Failed to comment:', error);
            }
        }
    };

    // Handle new post
    const handlePost = async () => {
        if (publicKey && sessionStatus.active && newPostContent.trim()) {

            if (newPostContent.length > 280) {
                alert('Post content cannot exceed 280 characters');
                return;
            }

            try {
                await post.mutateAsync({
                    content: newPostContent.trim(),
                    authority: publicKey,
                    sessionKeypair: sessionKeypair!
                });
                setNewPostContent("");
            } catch (error) {
                console.error('Failed to create post:', error);
            }
        }
    };

    // Load session keypair from localStorage on mount
    useEffect(() => {
        // const savedKeypair = localStorage.getItem('sessionKeypair');
        if (publicKey) {
            const savedSession = sessionStorage.getItem(`session_${publicKey.toString()}`);
            if (savedSession) {
                try {
                    const sessionData = JSON.parse(savedSession);
                    const secretKey = new Uint8Array(sessionData.secretKey);
                    const keypair = Keypair.fromSecretKey(secretKey);
                    setSessionKeypair(keypair);
                } catch (error) {
                    console.error('Failed to load session keypair:', error);
                    localStorage.removeItem('sessionKeypair');
                }
            }

        }
    }, [publicKey]);

    // Toggle comment expansion
    const toggleComments = (postId: number) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        postId;
        
        // setExpandedComments(prev => {
        //     const newSet = new Set(prev);
        //     if (newSet.has(postId)) {
        //         newSet.delete(postId);
        //     } else {
        //         newSet.add(postId);
        //     }
        //     return newSet;
        // });
    };

    // User creation form
    if (connected && !userExist && !showUserForm) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-center mb-6">Welcome to <span className="text-4xl">Solana<span className="text-blue-500">X</span></span> </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                        Create your profile to get started
                    </p>
                    <button
                        onClick={() => setShowUserForm(true)}
                        className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600"
                    >
                        Create Profile
                    </button>
                </div>
            </div>
        );
    }

    if (showUserForm) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex justify-center">
                        <h1 className="text-4xl font-bold">
                            Solana<span className="text-blue-500">X</span>
                        </h1>
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-6">Create Your Profile</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your username"
                                maxLength={50}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Tell us about yourself"
                                rows={3}
                                maxLength={200}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Profile Picture</label>
                            <input
                                // type="url"
                                // value={profilePic}
                                // onChange={(e) => setProfilePic(e.target.value)}
                                // className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                // placeholder="https://example.com/avatar.jpg"
                                // id="picture" 
                                type="url" 
                                accept="image/*"
                                value={profilePic}
                                onChange={(e) => setProfilePic(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowUserForm(false)}
                                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createUser}
                                disabled={!username.trim() || !bio.trim() || initializeUser.isPending}
                                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                            >
                                {initializeUser.isPending ? 'Creating...' : 'Create Profile'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative mx-auto p-4 min-h-screen max-w-2xl">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold">Solana<span className="text-blue-500">X</span></h1>
                    <div className="flex items-center gap-2">
                        <WalletButton />
                        <ThemeSelect />
                    </div>
                </div>

                {/* Settings Panel */}
                {/* {showSettings && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Settings</span>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular')}
                                    className="px-2 py-1 text-sm border rounded bg-white dark:bg-gray-600"
                                >
                                    <option value="newest">Newest</option>
                                    <option value="popular">Most Liked</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Show:</span>
                                <select
                                    value={filterByUser}
                                    onChange={(e) => setFilterByUser(e.target.value)}
                                    className="px-2 py-1 text-sm border rounded bg-white dark:bg-gray-600"
                                >
                                    <option value="all">All Posts</option>
                                    <option value="mine">My Posts</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )} */}
                
                {/* Session Status */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="grid items-center gap-2">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-medium">Session Status:</span>
                                <span className={`text-sm ${sessionStatus.active ? 'text-green-600' : 'text-red-600'}`}>
                                    {sessionStatus.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-light">Session Keypair:</span>
                                <span className="text-sm font-light">
                                    {sessionKeypair?.publicKey.toString().slice(0, 8)}...
                                </span>
                            </div>
                        </div>
                        {sessionStatus.active ? (
                            <div className="flex items-center gap-2">
                                <div className="text-sm">
                                    Balance: {sessionBalance / LAMPORTS_PER_SOL} SOL
                                </div>
                                <button
                                    onClick={() => handleFundSession(0.01)}
                                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                >
                                    Fund +0.01
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={createSession}
                                disabled={!connected || initializeSession.isPending}
                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                            >
                                {initializeSession.isPending ? 'Creating...' : 'Create Session'}
                            </button>
                        )}
                    </div>
                    
                    {sessionStatus.active && (
                        <div className="mt-2 text-xs text-gray-500">
                            Expires: {sessionStatus.expires?.toLocaleString()}
                        </div>
                    )}

                    {/* Refund Status */}
                    {sessionStatus.active && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-green-800 dark:text-green-200">
                                    {/* {refundStatus.timeUntilRefund > 0 
                                        ? `Auto-refund in ${refundStatus.timeUntilRefund} min` 
                                        : 'Session expired - refund available'
                                    } */}
                                    Refund available
                                </span>
                                <button
                                    onClick={handleRefund}
                                    disabled={refundSession.isPending}
                                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                                >
                                    {refundSession.isPending ? 'Refunding...' : `Refund SOL`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Post Creation */}
                {userExist && (
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                                {currentUser?.profilePicture ? (
                                    <Image 
                                        src={currentUser.profilePicture} 
                                        alt={currentUser.username || 'User'} 
                                        className="w-full h-full object-cover"
                                        width={40}
                                        height={40}
                                    />
                                ) : (
                                    <span className="text-white font-semibold text-sm">
                                        {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : 'U'}
                                    </span>
                                )}
                            </div>
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="What's happening on Solana?"
                                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                                rows={3}
                                maxLength={280}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                {newPostContent.length}/280 characters
                            </div>
                            <button
                                onClick={handlePost}
                                disabled={!newPostContent.trim() || !sessionStatus.active || post.isPending}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                {post.isPending ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>
                )}
                {/* {userExist && (
                    <div className="flex gap-3">
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="What's happening on Solana?"
                            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                            rows={3}
                            maxLength={280}
                        />
                        <button
                            onClick={handlePost}
                            disabled={!newPostContent.trim() || !sessionStatus.active || post.isPending}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {post.isPending ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                )}
                
                {newPostContent && (   
                    <div className="mt-2 text-xs text-gray-500 text-right">
                        {newPostContent.length}/280 characters
                    </div>
                )} */}
            </div>
            
            {/* Posts Feed */}
            <div className="space-y-4">
                {/* {publicKey && postAccounts.data && filterPosts(sortPosts(postAccounts.data)).map((postData, index) => { */}
                {publicKey && postAccounts.data && (postAccounts.data).map((postData, index) => {
                    const postAccount = postData.account;
                    const postId = postAccount.postId.toNumber();
                    const userData = getUserByAuthority(postAccount.authority);
                    // const userStats = getUserStats(postAccount.authority);
                    // const isExpanded = expandedComments.has(postId);

                    return (
                        <div key={`post-${postAccount.authority.toString()}-${postId}-${index}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                                        {userData?.profilePicture ? (
                                            <Image 
                                                src={userData.profilePicture} 
                                                alt={userData.username || 'User'} 
                                                width={40}
                                                height={40}
                                                className="w-full h-full object-cover"
                                                // onError={(e) => {
                                                //     // Fallback to initials if image fails to load
                                                //     e.currentTarget.style.display = 'none';
                                                //     e.currentTarget.nextElementSibling.style.display = 'flex';
                                                // }}
                                            />
                                        ) : null}
                                        <span 
                                            className="text-white font-semibold text-sm flex items-center justify-center w-full h-full"
                                            style={{ display: userData?.profilePicture ? 'none' : 'flex' }}
                                        >
                                            {userData?.username ? userData.username.slice(0, 2).toUpperCase() : 
                                             postAccount.authority.toString().slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {userData?.username || `${postAccount.authority.toString().slice(0, 8)}...`}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(postAccount.createdAt.toNumber() * 1000).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-gray-900 dark:text-white mb-4">{postAccount.content}</p>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleLike(postAccount)}
                                        disabled={like.isPending}
                                        className="flex items-center gap-2 px-3 py-1 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <Heart className="w-4 h-4" />
                                        <span className="text-sm">{postAccount.likes.toNumber()}</span>
                                    </button>
                                    
                                    <button onClick={() => toggleComments(postId)} disabled={comment.isPending} className="flex items-center gap-2 px-3 py-1 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <MessageCircle className="w-4 h-4" />
                                        <span className="text-sm">{postAccount.commentCount.toNumber()}</span>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Comment Input */}
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                                        onKeyPress={(e) => e.key === 'Enter' && handleComment(postAccount)}
                                    />
                                    <button
                                        onClick={() => handleComment(postAccount)}
                                        disabled={!newComment.trim() || !sessionStatus.active || comment.isPending}
                                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Loading state */}
            {postAccounts.isLoading && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading posts...</p>
                </div>
            )}
            
            {/* Empty state */}
            {postAccounts.data?.length === 0 && !postAccounts.isLoading && (
                <div className="text-center py-8">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No posts yet. Be the first to share something!</p>
                </div>
            )}
            
            {/* Info Panel */}
            <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">How It Works</h3>
                <ul className="text-sm space-y-1 text-gray-400 dark:text-gray-500">
                    <li>• Connect your wallet and create a profile</li>
                    <li>• Create a session that pays for transaction fees</li>
                    <li>• Like, comment, and post instantly</li>
                    <li>• Refund unused SOL when session</li>
                </ul>
            </div>
        </div>
    );
}


// function PostCard({ account }: { account: PublicKey }) {
//     const { postAccounts } = useSocialProgramAccount({account});
//     const { userAccounts, like, comment } = useSocialProgram()
//     const { publicKey } = useWallet();
//     const [newComment, setNewComment] = useState<{[key: string]: CommentType}>({});

//     // Helper function to get user data by authority
//     const getUserByAuthority = (authority: PublicKey) => {
//         return userAccounts.data?.find(user => 
//             user.account.authority.equals(authority)
//         )?.account;
//     };

//     // Handle like action
//     const handleLike = async (postData: any) => {
//         if (publicKey) {
//             try {
//                 await like.mutateAsync({
//                     postCount: postData.postId.toNumber(),
//                     authority: publicKey,
//                     postAuthority: postData.authority
//                 });
//             } catch (error) {
//                 console.error('Failed to like post:', error);
//             }
//         }
//     };

//     // Handle comment
//     const handleComment = async (postData: any) => {
//         const commentContent = newComment[postData.postId.toNumber()]?.content;
//         if (publicKey && commentContent?.trim()) {
//             try {
//                 await comment.mutateAsync({
//                     content: commentContent.trim(),
//                     authority: publicKey,
//                     postAuthority: postData.authority,
//                     postCount: postData.postId.toNumber()
//                 });
                
//                 // Clear comment input
//                 setNewComment(prev => ({
//                     ...prev,
//                     [postData.postId.toNumber()]: { content: "" }
//                 }));
//             } catch (error) {
//                 console.error('Failed to comment:', error);
//             }
//         }
//     };

//     return (
//         <div className="space-y-4">
//                 {publicKey && postAccounts.data?.map((postData, index) => {
//                     const postAccount = postData.account;
//                     const postId = postAccount.postId.toNumber();
//                     const userData = getUserByAuthority(postAccount.authority);

//                     return (
//                         <div key={`post-${postAccount.authority.toString()}-${postId}-${index}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
//                             <div className="flex items-center justify-between mb-3">
//                                 <div className="flex items-center gap-3">
//                                     <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
//                                         {userData?.profilePicture ? (
//                                             <Image 
//                                                 src={userData.profilePicture} 
//                                                 alt={userData.username || 'User'} 
//                                                 width={40}
//                                                 height={40}
//                                                 className="w-full h-full object-cover"
//                                                 // onError={(e) => {
//                                                 //     // Fallback to initials if image fails to load
//                                                 //     e.currentTarget.style.display = 'none';
//                                                 //     e.currentTarget.nextElementSibling.style.display = 'flex';
//                                                 // }}
//                                             />
//                                         ) : null}
//                                         <span 
//                                             className="text-white font-semibold text-sm flex items-center justify-center w-full h-full"
//                                             style={{ display: userData?.profilePicture ? 'none' : 'flex' }}
//                                         >
//                                             {userData?.username ? userData.username.slice(0, 2).toUpperCase() : 
//                                              postAccount.authority.toString().slice(0, 2).toUpperCase()}
//                                         </span>
//                                     </div>
//                                     <div>
//                                         <div className="font-semibold text-gray-900 dark:text-white">
//                                             {userData?.username || `${postAccount.authority.toString().slice(0, 8)}...`}
//                                         </div>
//                                         <div className="text-sm text-gray-500">
//                                             {new Date(postAccount.createdAt.toNumber() * 1000).toLocaleDateString()}
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
                            
//                             <p className="text-gray-900 dark:text-white mb-4">{postAccount.content}</p>
                            
//                             <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
//                                 <div className="flex items-center gap-4">
//                                     <button
//                                         onClick={() => handleLike(postAccount)}
//                                         disabled={like.isPending}
//                                         className="flex items-center gap-2 px-3 py-1 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
//                                     >
//                                         <Heart className="w-4 h-4" />
//                                         <span className="text-sm">{postAccount.likes.toNumber()}</span>
//                                     </button>
                                    
//                                     <button className="flex items-center gap-2 px-3 py-1 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
//                                         <MessageCircle className="w-4 h-4" />
//                                         <span className="text-sm">{postAccount.commentCount.toNumber()}</span>
//                                     </button>
//                                 </div>
//                             </div>
                            
//                             {/* Comment Input */}
//                             <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
//                                 <div className="flex gap-2">
//                                     <input
//                                         type="text"
//                                         value={newComment[postId]?.content || ''}
//                                         onChange={(e) => setNewComment(prev => ({ 
//                                             ...prev, 
//                                             [postId]: { content: e.target.value } 
//                                         }))}
//                                         placeholder="Add a comment..."
//                                         className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
//                                         onKeyPress={(e) => e.key === 'Enter' && handleComment(postAccount)}
//                                     />
//                                     <button
//                                         onClick={() => handleComment(postAccount)}
//                                         disabled={!newComment[postId]?.content?.trim() || comment.isPending}
//                                         className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
//                                     >
//                                         <Send className="w-4 h-4" />
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     );
//                 })}
//             </div>
//     )
// }