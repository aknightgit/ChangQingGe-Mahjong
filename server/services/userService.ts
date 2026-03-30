import { getCollection } from '../utils/mongo';
import type { User } from '../types/database';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

export class UserService {
  private static COLLECTION_NAME = 'users';

  /**
   * Simple password hash (SHA-256, for demo - use bcrypt in production)
   */
  private static hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  /**
   * Validate Chinese phone number (11 digits, starts with 1)
   */
  static isValidPhone(phone: string): boolean {
    return /^1[3-9]\d{9}$/.test(phone);
  }

  /**
   * Register user with phone + password
   */
  static async registerByPhone(data: {
    name: string;
    phone: string;
    password: string;
  }): Promise<User> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);

    // 验证手机号格式
    if (!this.isValidPhone(data.phone)) {
      throw new Error('手机号格式不正确（需11位国内手机号）');
    }

    // 检查手机号是否已注册
    const existing = await collection.findOne({ phone: data.phone });
    if (existing) {
      throw new Error('该手机号已注册');
    }

    // 验证密码
    if (!data.password || data.password.length < 4) {
      throw new Error('密码至少4位');
    }

    // 验证昵称
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('玩家名不能为空');
    }

    const user: User = {
      userId: randomUUID(),
      email: '', // 本地注册不需要email
      name: data.name.trim(),
      phone: data.phone,
      passwordHash: this.hashPassword(data.password),
      oauthProvider: 'local',
      isAdmin: false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        highestFan: 0,
        winRate: 0
      }
    };

    await collection.insertOne(user);
    return user;
  }

  /**
   * Login with phone + password
   */
  static async loginByPhone(phone: string, password: string): Promise<User> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);

    if (!this.isValidPhone(phone)) {
      throw new Error('手机号格式不正确');
    }

    const user = await collection.findOne({ phone });
    if (!user) {
      throw new Error('该手机号未注册');
    }

    const hash = this.hashPassword(password);
    if (user.passwordHash !== hash) {
      throw new Error('密码错误');
    }

    // 更新最后登录时间
    await collection.updateOne(
      { userId: user.userId },
      { $set: { lastLoginAt: new Date() } }
    );

    return { ...user, lastLoginAt: new Date() };
  }

  /**
   * Check if phone is registered
   */
  static async isPhoneRegistered(phone: string): Promise<boolean> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    const user = await collection.findOne({ phone });
    return !!user;
  }

  /**
   * Create a new user (for local registration)
   */
  static async createUser(data: {
    email: string;
    name: string;
    avatar?: string;
    isAdmin?: boolean;
  }): Promise<User> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    
    const user: User = {
      userId: randomUUID(),
      email: data.email,
      name: data.name,
      avatar: data.avatar,
      oauthProvider: 'local',
      isAdmin: data.isAdmin ?? false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        highestFan: 0,
        winRate: 0
      }
    };

    await collection.insertOne(user);
    return user;
  }

  /**
   * List all users (debug/admin tooling)
   */
  static async getAllUsers(): Promise<User[]> {
    const collection = await getCollection<User>(this.COLLECTION_NAME)
    return await collection.find({}).sort({ createdAt: 1 }).toArray()
  }

  static async getUsersByProvider(provider: User['oauthProvider']): Promise<User[]> {
    const collection = await getCollection<User>(this.COLLECTION_NAME)
    return await collection.find({ oauthProvider: provider }).sort({ createdAt: 1 }).toArray()
  }

  /**
   * Create or update user from Google OAuth
   */
  static async upsertGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<User> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    
    // Check if user exists
    const existingUser = await collection.findOne({ 
      oauthProvider: 'google',
      oauthId: profile.googleId 
    });

    if (existingUser) {
      // Update last login and profile
      await collection.updateOne(
        { userId: existingUser.userId },
        { 
          $set: { 
            lastLoginAt: new Date(),
            name: profile.name,
            avatar: profile.avatar,
            email: profile.email
          } 
        }
      );
      return { ...existingUser, lastLoginAt: new Date() };
    }

    // Create new user
    const newUser: User = {
      userId: randomUUID(),
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      oauthProvider: 'google',
      oauthId: profile.googleId,
      isAdmin: false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        highestFan: 0,
        winRate: 0
      }
    };

    await collection.insertOne(newUser);
    return newUser;
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    return await collection.findOne({ userId });
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    return await collection.findOne({ email });
  }

  /**
   * Update user stats after game
   */
  static async updateStats(userId: string, updates: {
    gamesPlayed?: number;
    gamesWon?: number;
    scoreChange?: number;
    highestFan?: number;
  }): Promise<void> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    
    const user = await this.getUserById(userId);
    if (!user) return;

    const newStats = { ...user.stats };
    if (updates.gamesPlayed) newStats.gamesPlayed += updates.gamesPlayed;
    if (updates.gamesWon) newStats.gamesWon += updates.gamesWon;
    if (updates.scoreChange) newStats.totalScore += updates.scoreChange;
    if (updates.highestFan && updates.highestFan > newStats.highestFan) {
      newStats.highestFan = updates.highestFan;
    }
    newStats.winRate = newStats.gamesPlayed > 0 
      ? newStats.gamesWon / newStats.gamesPlayed 
      : 0;

    await collection.updateOne(
      { userId },
      { $set: { stats: newStats } }
    );
  }

  /**
   * Update basic profile fields for a user
   */
  static async updateProfile(userId: string, profile: {
    name: string;
    address?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
  }): Promise<User | null> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);

    const name = profile.name?.trim();
    if (!name) {
      throw new Error('Name is required');
    }

    const setDoc: Partial<User> = {
      name,
      profileUpdatedAt: new Date()
    };
    const unsetDoc: Record<string, ''> = {};

    const handleOptionalField = (
      field: keyof Pick<User, 'address' | 'dateOfBirth' | 'gender'>,
      value?: string | null
    ) => {
      if (value && value.toString().trim()) {
        setDoc[field] = value.toString().trim();
      } else {
        unsetDoc[field] = '';
      }
    };

    handleOptionalField('address', profile.address);
    handleOptionalField('dateOfBirth', profile.dateOfBirth);
    handleOptionalField('gender', profile.gender);

    const updateQuery: Record<string, unknown> = {
      $set: setDoc
    };

    if (Object.keys(unsetDoc).length > 0) {
      updateQuery.$unset = unsetDoc;
    }

    await collection.updateOne({ userId }, updateQuery);
    return await this.getUserById(userId);
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit: number = 10): Promise<User[]> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    return await collection
      .find({})
      .sort({ 'stats.totalScore': -1 })
      .limit(limit)
      .toArray();
  }
}
