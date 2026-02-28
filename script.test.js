import { describe, it, expect } from 'vitest';
import { createUser } from './script';
describe('Простейший тест', () => {
    it('createUser должен работать', () => {
        const user = createUser(1, 'Тест');
        expect(user.name).toBe('Тест');
        expect(user.id).toBe(1);
        expect(user.isActive).toBe(true);
    });
});
//# sourceMappingURL=script.test.js.map