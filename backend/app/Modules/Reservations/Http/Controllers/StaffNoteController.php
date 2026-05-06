<?php

namespace App\Modules\Reservations\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\StaffNote;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class StaffNoteController extends Controller
{
    use ApiResponseTrait;

    public function index(Reservation $reservation)
    {
        $this->authorizeNoteAccess();

        $notes = $reservation->staffNotes()
            ->with('author:id,name,role')
            ->latest()
            ->get();

        return $this->successResponse($notes->map(fn (StaffNote $n) => [
            'id'          => $n->id,
            'note'        => $n->note,
            'isEscalated' => $n->is_escalated,
            'author'      => $n->author ? ['id' => $n->author->id, 'name' => $n->author->name] : null,
            'createdAt'   => $n->created_at,
        ]), 'Staff notes fetched');
    }

    public function store(Request $request, Reservation $reservation)
    {
        $this->authorizeNoteAccess();

        $data = $request->validate([
            'note'         => ['required', 'string', 'max:2000'],
            'is_escalated' => ['boolean'],
        ]);

        $note = StaffNote::create([
            'reservation_id' => $reservation->id,
            'user_id'        => auth()->id(),
            'note'           => $data['note'],
            'is_escalated'   => $data['is_escalated'] ?? false,
        ]);

        return $this->successResponse($note->load('author:id,name'), 'Note added', 201);
    }

    /**
     * All notes created by the authenticated staff/admin user across all reservations.
     */
    public function myNotes()
    {
        $this->authorizeNoteAccess();

        $notes = StaffNote::query()
            ->where('user_id', auth()->id())
            ->with('reservation:id,reference_no')
            ->latest()
            ->get();

        return $this->successResponse($notes->map(fn (StaffNote $n) => [
            'id'          => $n->id,
            'note'        => $n->note,
            'is_escalated' => $n->is_escalated,
            'createdAt'   => $n->created_at,
            'author'      => ['id' => auth()->id(), 'name' => auth()->user()->name],
            'reservation' => $n->reservation
                ? ['id' => $n->reservation->id, 'reference_no' => $n->reservation->reference_no]
                : null,
        ]), 'My notes fetched');
    }

    public function destroy(Reservation $reservation, StaffNote $note)
    {
        // Ensure the note belongs to the reservation in the URL
        if ($note->reservation_id !== $reservation->id) {
            abort(404, 'Note not found for this reservation.');
        }

        $user = auth()->user();
        if ($user->role !== 'admin' && $note->user_id !== $user->id) {
            abort(403, 'Cannot delete this note.');
        }
        $note->delete();
        return $this->successResponse(null, 'Note deleted');
    }

    private function authorizeNoteAccess(): void
    {
        $role = auth()->user()?->role;
        if (! in_array($role, ['admin', 'admin_staff'], true)) {
            abort(403, 'Access denied.');
        }
    }
}
