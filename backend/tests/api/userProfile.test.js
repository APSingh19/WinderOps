import { jest } from '@jest/globals';

const mockUserModel = {
  findById: jest.fn(),
  findOne: jest.fn()
};

const mockCanManageEmployee = jest.fn();

jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: mockUserModel
}));

jest.unstable_mockModule('../../src/models/Project.js', () => ({
  default: {}
}));

jest.unstable_mockModule('../../src/models/Task.js', () => ({
  default: {}
}));

jest.unstable_mockModule('../../src/services/hierarchyService.js', () => ({
  canManageEmployee: mockCanManageEmployee,
  getReportingChain: jest.fn(),
  getVisibleEmployeeIds: jest.fn()
}));

const { updateProfile, updateUser } = await import('../../src/controllers/userController.js');

const makeResponse = () => {
  let resolve;
  const result = new Promise((done) => {
    resolve = done;
  });
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      resolve({ payload, statusCode: this.statusCode });
      return this;
    }
  };
  const next = (error) => resolve({ error, statusCode: res.statusCode });
  return { res, next, result };
};

const makeUserDoc = (overrides = {}) => ({
  _id: 'user-1',
  name: 'Old Name',
  email: 'old@example.com',
  role: 'Employee',
  title: 'Team Member',
  designation: 'Team Member',
  save: jest.fn(async () => {}),
  populate: jest.fn(async function populate() {
    return this;
  }),
  ...overrides
});

describe('user profile editing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates only allowed self-profile fields', async () => {
    const req = {
      user: makeUserDoc({ role: 'Employee' }),
      body: {
        name: 'Asha Rao',
        email: 'asha@example.com',
        title: 'Frontend Engineer',
        designation: 'UI Engineer',
        bio: 'Builds product dashboards.',
        skills: ['React', 'Node'],
        weeklyCapacityHours: 36,
        maxActiveTasks: 6,
        role: 'Admin'
      }
    };
    mockUserModel.findOne.mockResolvedValue(null);
    const { res, next, result } = makeResponse();

    updateProfile(req, res, next);
    const response = await result;

    expect(response.statusCode).toBe(200);
    expect(req.user.save).toHaveBeenCalledTimes(1);
    expect(response.payload.name).toBe('Asha Rao');
    expect(response.payload.email).toBe('asha@example.com');
    expect(response.payload.skills).toEqual(['React', 'Node']);
    expect(response.payload.role).toBe('Employee');
  });

  it('allows company admins to edit member profile and role fields', async () => {
    const targetUser = makeUserDoc();
    mockUserModel.findById.mockResolvedValue(targetUser);
    const req = {
      params: { id: 'user-1' },
      user: { _id: 'admin-1', role: 'Admin' },
      body: {
        name: 'Meera Shah',
        email: 'meera@example.com',
        role: 'Member',
        designation: 'Support Specialist',
        skills: ['Customers'],
        managerId: 'manager-1'
      }
    };
    mockUserModel.findOne.mockResolvedValue(null);
    const { res, next, result } = makeResponse();

    updateUser(req, res, next);
    const response = await result;

    expect(response.statusCode).toBe(200);
    expect(mockCanManageEmployee).not.toHaveBeenCalled();
    expect(targetUser.save).toHaveBeenCalledTimes(1);
    expect(response.payload.name).toBe('Meera Shah');
    expect(response.payload.email).toBe('meera@example.com');
    expect(response.payload.role).toBe('Member');
    expect(response.payload.reportingManager).toBe('manager-1');
  });

  it('blocks managers from editing people outside their reporting tree', async () => {
    const targetUser = makeUserDoc();
    mockUserModel.findById.mockResolvedValue(targetUser);
    mockCanManageEmployee.mockResolvedValue(false);
    const req = {
      params: { id: 'user-1' },
      user: { _id: 'lead-1', role: 'Team Leader' },
      body: { name: 'Blocked Edit' }
    };
    const { res, next, result } = makeResponse();

    updateUser(req, res, next);
    const response = await result;

    expect(response.statusCode).toBe(403);
    expect(response.error.message).toBe('You can only edit people in your reporting tree');
    expect(targetUser.save).not.toHaveBeenCalled();
  });

  it('rejects duplicate profile email changes', async () => {
    const req = {
      user: makeUserDoc({ _id: 'user-1', email: 'old@example.com' }),
      body: { email: 'taken@example.com' }
    };
    mockUserModel.findOne.mockResolvedValue({ _id: 'other-user' });
    const { res, next, result } = makeResponse();

    updateProfile(req, res, next);
    const response = await result;

    expect(response.statusCode).toBe(409);
    expect(response.error.message).toBe('Email is already registered');
    expect(req.user.save).not.toHaveBeenCalled();
  });
});
