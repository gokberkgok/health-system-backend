// Dashboard service - Aggregated stats for dashboard
export class DashboardService {
    constructor(customerRepository, appointmentRepository) {
        this.customerRepository = customerRepository;
        this.appointmentRepository = appointmentRepository;
    }

    /**
     * Get dashboard statistics
     */
    async getStats(companyId) {
        const [
            totalCustomers,
            genderStats,
            todayAppointments,
            upcomingAppointments,
        ] = await Promise.all([
            this.customerRepository.count(companyId),
            this.customerRepository.getGenderStats(companyId),
            this.appointmentRepository.countToday(companyId),
            this.appointmentRepository.getUpcoming(companyId, 5),
        ]);

        return {
            customers: {
                total: totalCustomers,
                byGender: genderStats,
            },
            appointments: {
                today: todayAppointments,
                upcoming: upcomingAppointments.map(apt => ({
                    id: apt.id.toString(),
                    customerName: apt.customer?.fullName,
                    customerPhone: apt.customer?.phone,
                    startTime: apt.startTime.toISOString(),
                    endTime: apt.endTime.toISOString(),
                    devices: apt.devices?.map(d => d.deviceName),
                    date: apt.startTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                })),
            },
            systemStatus: 'operational',
        };
    }
}

export default DashboardService;
