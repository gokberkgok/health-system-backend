// Reports service - Business logic for financial and operational reports
import { ValidationError } from '../utils/errors.js';

export class ReportsService {
    constructor(paymentRepository, appointmentRepository, customerRepository) {
        this.paymentRepository = paymentRepository;
        this.appointmentRepository = appointmentRepository;
        this.customerRepository = customerRepository;
    }

    /**
     * Get daily revenue report
     */
    async getDailyRevenue(companyId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const payments = await this.paymentRepository.findByDateRange(
            companyId,
            startOfDay,
            endOfDay
        );

        const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const cashPayments = payments.filter(p => p.paymentType === 'CASH');
        const installmentPayments = payments.filter(p => p.paymentType === 'INSTALLMENT');

        return {
            date: date,
            total,
            count: payments.length,
            byType: {
                cash: {
                    total: cashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
                    count: cashPayments.length
                },
                installment: {
                    total: installmentPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
                    count: installmentPayments.length
                }
            }
        };
    }

    /**
     * Get total appointments statistics
     */
    async getAppointmentStats(companyId) {
        const allAppointments = await this.appointmentRepository.findMany(companyId, {
            page: 1,
            limit: 10000 // Get all appointments
        });

        // Count non-cancelled appointments
        const totalAppointments = allAppointments.appointments.filter(
            apt => apt.status !== 'cancelled'
        ).length;

        return {
            total: totalAppointments,
            breakdown: {
                scheduled: allAppointments.appointments.filter(apt => apt.status === 'scheduled').length,
                completed: allAppointments.appointments.filter(apt => apt.status === 'completed').length,
                in_progress: allAppointments.appointments.filter(apt => apt.status === 'in_progress').length
            }
        };
    }

    /**
     * Get monthly revenue report with daily breakdown
     */
    async getMonthlyRevenue(companyId, year, month) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        const payments = await this.paymentRepository.findByDateRange(
            companyId,
            startOfMonth,
            endOfMonth
        );

        // Group by day
        const dailyBreakdown = {};
        const daysInMonth = endOfMonth.getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            dailyBreakdown[day] = { total: 0, count: 0 };
        }

        payments.forEach(payment => {
            const day = new Date(payment.paidAt).getDate();
            dailyBreakdown[day].total += parseFloat(payment.amount);
            dailyBreakdown[day].count += 1;
        });

        const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        return {
            year,
            month,
            total,
            count: payments.length,
            dailyBreakdown: Object.entries(dailyBreakdown).map(([day, data]) => ({
                day: parseInt(day),
                ...data
            })),
            byType: {
                cash: {
                    total: payments
                        .filter(p => p.paymentType === 'CASH')
                        .reduce((sum, p) => sum + parseFloat(p.amount), 0),
                    count: payments.filter(p => p.paymentType === 'CASH').length
                },
                installment: {
                    total: payments
                        .filter(p => p.paymentType === 'INSTALLMENT')
                        .reduce((sum, p) => sum + parseFloat(p.amount), 0),
                    count: payments.filter(p => p.paymentType === 'INSTALLMENT').length
                }
            }
        };
    }

    /**
     * Get top revenue-generating devices/services
     */
    async getTopDevices(companyId, startDate, endDate, limit = 5) {
        const appointments = await this.appointmentRepository.findByDateRange(
            companyId,
            startDate,
            endDate
        );

        // Count device usage
        const deviceStats = {};

        appointments.forEach(apt => {
            if (apt.devices && apt.devices.length > 0) {
                apt.devices.forEach(device => {
                    if (!deviceStats[device.deviceName]) {
                        deviceStats[device.deviceName] = {
                            deviceName: device.deviceName,
                            appointmentCount: 0,
                            totalRevenue: 0
                        };
                    }
                    deviceStats[device.deviceName].appointmentCount++;
                });
            }
        });

        // Sort by appointment count
        const sortedDevices = Object.values(deviceStats)
            .sort((a, b) => b.appointmentCount - a.appointmentCount)
            .slice(0, limit);

        return sortedDevices;
    }

    /**
     * Get outstanding debts (unpaid balances)
     */
    async getOutstandingDebts(companyId, minAmount = 0) {
        const customers = await this.customerRepository.findMany(companyId, {
            page: 1,
            limit: 1000 // Get all customers
        });

        // Filter customers with debt
        const customersWithDebt = customers.customers
            .filter(c => parseFloat(c.totalDebt || 0) > minAmount)
            .map(c => ({
                id: c.id.toString(),
                fullName: c.fullName,
                phone: c.phone,
                totalDebt: parseFloat(c.totalDebt || 0)
            }))
            .sort((a, b) => b.totalDebt - a.totalDebt);

        const totalOutstanding = customersWithDebt.reduce((sum, c) => sum + c.totalDebt, 0);

        return {
            total: totalOutstanding,
            count: customersWithDebt.length,
            customers: customersWithDebt
        };
    }

    /**
     * Get comprehensive financial summary
     */
    async getFinancialSummary(companyId, startDate, endDate) {
        const [
            revenue,
            topDevices,
            outstandingDebts
        ] = await Promise.all([
            this.paymentRepository.findByDateRange(companyId, new Date(startDate), new Date(endDate)),
            this.getTopDevices(companyId, startDate, endDate, 5),
            this.getOutstandingDebts(companyId, 0)
        ]);

        const totalRevenue = revenue.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const appointmentCount = await this.appointmentRepository.countByDateRange(
            companyId,
            new Date(startDate),
            new Date(endDate)
        );

        return {
            period: { startDate, endDate },
            revenue: {
                total: totalRevenue,
                count: revenue.length,
                average: revenue.length > 0 ? totalRevenue / revenue.length : 0
            },
            appointments: {
                total: appointmentCount
            },
            topDevices,
            outstandingDebts: {
                total: outstandingDebts.total,
                count: outstandingDebts.count
            }
        };
    }
}

export default ReportsService;
